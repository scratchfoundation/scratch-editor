const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const formatMessage = require('format-message');
const log = require('../../util/log');

const translations = require('./translations');

// Merge this extension's block-label translations into format-message's current
// table, preserving every other locale/key already registered.
//
// We can't just call `formatMessage.setup({translations: {th: ...}})` once at
// module load: scratch-vm's `VirtualMachine.setLocale(locale, messages)` does
// `formatMessage.setup({translations: {[locale]: messages}})`, and
// format-message's `setup` *replaces* the whole `translations` object — so the
// GUI's locale init/change (which passes the scratch-l10n editor messages, with
// no `spark.*` keys) wipes our strings and the blocks fall back to their English
// `default:` text. Re-applying the merge at the top of `getInfo()` (called by
// the GUI after `setLocale`, on every palette refresh) keeps our translations
// alive regardless of ordering. Idempotent.
const applySparkTranslations = () => {
    const current = formatMessage.setup().translations || {};
    const merged = {};
    Object.keys(current).forEach(loc => {
        merged[loc] = Object.assign({}, current[loc]);
    });
    Object.keys(translations).forEach(loc => {
        merged[loc] = Object.assign({}, merged[loc] || {}, translations[loc]);
    });
    formatMessage.setup({translations: merged});
};
applySparkTranslations();

const EXTENSION_ID = 'Sparky';
// Story 10.1: env-injected for K8s deployment via runtime /env-config.js; falls back to localhost for Electron desktop.
const WS_URL = (typeof window !== 'undefined' && window.SPARK_ENV && window.SPARK_ENV.MIDDLEWARE_WS_URL) || 'ws://localhost:8080';
const POLL_INTERVAL_MS = 30;

// R2 amendment (SCP 2026-05-08): closed 4-state enum matching the
// Spark-Baseboard bi-color LED. Yellow = additive red+green.
// Blue and White were dropped; the matrix has no blue channel.
const LedColor = {
    RED: 'red',
    GREEN: 'green',
    YELLOW: 'yellow',
    OFF: 'off'
};

const LED_COLOR_MAP = {
    red: {r: 255, g: 0, b: 0},
    green: {r: 0, g: 255, b: 0},
    yellow: {r: 255, g: 255, b: 0},
    off: {r: 0, g: 0, b: 0}
};

const SparkButton = {A: 'A', B: 'B'};

// Story 3.4 (FR16) → 3.7/3.8/3.9 (SCP #4) — Thai one-shot warning toast copy
// per Mic/Light/TOF family. The firmware now returns a live {value} on a board
// with Spark-Sensors; on a board without it (or if init failed) it still
// answers hw_not_present, and the reporter falls back to the mock 0 + this
// once-per-family-per-session toast. Branch is on the *response*, not a build
// flag — the same .scratch project works on both substrates.
const STUB_TOAST_TH = {
    mic: 'ไมโครโฟนยังไม่พร้อม - แสดงค่าจำลอง 0',
    light: 'เซ็นเซอร์แสงยังไม่พร้อม - แสดงค่าจำลอง 0',
    tof: 'เซ็นเซอร์ระยะยังไม่พร้อม - แสดงค่าจำลอง 0'
};

// Map a sensor family to its firmware threshold cmd (whenLoud/whenBright/whenNear).
const SENSOR_THRESHOLD_CMD = {
    mic: 'set_mic_threshold',
    light: 'set_light_threshold',
    tof: 'set_tof_threshold'
};

class SparkPeripheral {
    constructor (runtime, extensionId) {
        this._runtime = runtime;
        this._extensionId = extensionId;
        this._ws = null;
        this._buttonState = {0: 0, 1: 0};
        // Story 2.3 (event-push): set by btn_press event; consumed by
        // whenButtonPressed HAT so the script fires once per press, not
        // every frame the button is held.
        this._buttonEdgeLatch = {0: false, 1: false};
        this._pollIntervalId = null;
        this._polling = false;
        this._lastButtonAccess = 0;
        this._pending = new Map();
        // Story 3.2 — last-known IMU values keyed by cmd; used as fallback when
        // the firmware returns hw_busy or the WS round-trip times out.
        this._imuCache = {imu_accel: null, imu_gyro: null, imu_angle: null};
        this._imuDegraded = false;
        // Story 3.3 (event-push): set by the firmware 'shake' event; consumed
        // by whenShake HAT so the script fires once per debounced gesture, not
        // every frame the threshold is exceeded. Mirror of _buttonEdgeLatch.
        // Refractory (500 ms) is enforced firmware-side in task_imu_sampler.
        this._shakeEdgeLatch = false;
        // Stories 3.7/3.8/3.9 (SCP #4): edge latches for the Spark-Sensors
        // HAT blocks, set by the firmware mic_loud / light_bright / tof_near
        // events (firmware enforces a 500 ms refractory + rising-edge). Same
        // pattern as _shakeEdgeLatch / _buttonEdgeLatch. Reset on disconnect.
        this._loudEdgeLatch = false;
        this._brightEdgeLatch = false;
        this._nearEdgeLatch = false;
        // Story 3.4 (FR16): block-families (mic/light/tof) whose Thai
        // sensor-pending toast has already been shown this session. Cleared on
        // disconnect so a re-connect re-arms the one-shot warnings.
        this._stubWarningShown = new Set();
        this._runtime.registerPeripheralExtension(extensionId, this);
    }

    isConnected () {
        return this._ws !== null && this._ws.readyState === 1; // WebSocket.OPEN
    }

    scan () {
        if (this._ws) this._ws.close();
        this._ws = new WebSocket(WS_URL);
        this._ws.onopen = () => {
            this._runtime.emit(this._runtime.constructor.PERIPHERAL_CONNECTED);
        };
        this._ws.onmessage = evt => this._onMessage(evt);
        this._ws.onerror = () => this._handleDisconnect();
        this._ws.onclose = () => this._handleDisconnect();
    }

    connect () {
        // Connection happens in scan() for WebSocket
    }

    disconnect () {
        this._stopPolling();
        this._stubWarningShown.clear(); // Story 3.4: re-arm one-shot toasts for the next session
        this._resetEdgeLatches();
        if (this._ws) {
            this._ws.close();
            this._ws = null;
        }
    }

    // Stories 3.7/3.8/3.9 (+ the deferred _shakeEdgeLatch follow-up): clear all
    // HAT edge latches on disconnect so a stale latch from before the drop
    // doesn't fire a HAT once on reconnect.
    _resetEdgeLatches () {
        this._shakeEdgeLatch = false;
        this._loudEdgeLatch = false;
        this._brightEdgeLatch = false;
        this._nearEdgeLatch = false;
        this._buttonEdgeLatch = {0: false, 1: false};
    }

    // send(cmd, data) — wraps into {protocol, type, id, cmd, data} per middleware schema
    send (cmd, data = {}) {
        if (!this.isConnected()) return Promise.resolve(null);
        const id = Math.random().toString(36)
            .slice(2) + Date.now().toString(36);
        const msg = {protocol: '1.0', type: 'request', id, cmd, data};
        return new Promise(resolve => {
            const timer = setTimeout(() => {
                this._pending.delete(id);
                resolve(null);
            }, 3000);
            this._pending.set(id, res => {
                clearTimeout(timer);
                resolve(res);
            });
            this._ws.send(JSON.stringify(msg));
        });
    }

    getButtonState (pin) {
        return this._buttonState[pin] || 0;
    }

    _onMessage (evt) {
        let msg;
        try {
            msg = JSON.parse(evt.data);
        } catch (e) {
            log.warn('spark: malformed JSON from peripheral', e);
            return;
        }
        if (msg.type === 'response' && msg.id && this._pending.has(msg.id)) {
            const resolve = this._pending.get(msg.id);
            this._pending.delete(msg.id);
            resolve(msg);
            return;
        }
        if (msg.type === 'event') {
            this._onEvent(msg);
        }
        // heartbeats are intentionally ignored
    }

    // Story 2.3 (event-push): firmware emits btn_press/btn_release events
    // (one per debounced edge); cache the latched state so the
    // whenButtonPressed HAT can fire once per press without continuous-fire
    // (which the polling-only path produced).
    _onEvent (msg) {
        const pin = msg.pin ?? 0;
        if (msg.event === 'btn_press') {
            this._buttonState[pin] = 1;
            this._buttonEdgeLatch[pin] = true;
        } else if (msg.event === 'btn_release') {
            this._buttonState[pin] = 0;
        } else if (msg.event === 'shake') {
            // Story 3.3 — one event per debounced gesture (firmware enforces
            // the 500 ms refractory). The whenShake HAT consumes the latch.
            this._shakeEdgeLatch = true;
        } else if (msg.event === 'mic_loud') {
            // Stories 3.7/3.8/3.9 — Spark-Sensors HAT events; firmware enforces
            // a rising-edge + 500 ms refractory. The whenLoud/whenBright/whenNear
            // HATs consume the latch (one fire per event).
            this._loudEdgeLatch = true;
        } else if (msg.event === 'light_bright') {
            this._brightEdgeLatch = true;
        } else if (msg.event === 'tof_near') {
            this._nearEdgeLatch = true;
        }
    }

    // Called by button blocks — records access time and starts polling if idle
    touchButtonPoll () {
        this._lastButtonAccess = Date.now();
        if (!this._polling && this._pollIntervalId === null) {
            this._scheduleNextPoll();
        }
    }

    _scheduleNextPoll () {
        this._pollIntervalId = setTimeout(() => {
            this._pollIntervalId = null;
            // Stop if no button block has been called in the last 500ms
            if (Date.now() - this._lastButtonAccess > 500) return;
            this._pollButtons();
        }, POLL_INTERVAL_MS);
    }

    _stopPolling () {
        if (this._pollIntervalId !== null) {
            clearTimeout(this._pollIntervalId);
            this._pollIntervalId = null;
        }
        this._polling = false;
    }

    _pollButtons () {
        if (!this.isConnected() || this._polling) return;
        this._polling = true;
        Promise.all([
            this.send('btn', {pin: 0}),
            this.send('btn', {pin: 1})
        ]).then(([resp0, resp1]) => {
            if (resp0 && resp0.status === 'ok') this._buttonState[0] = resp0.val ?? 0;
            if (resp1 && resp1.status === 'ok') this._buttonState[1] = resp1.val ?? 0;
        })
            .catch(() => {})
            .finally(() => {
                this._polling = false;
                this._scheduleNextPoll();
            });
    }

    // Story 3.2 — fetch a single IMU vector field. Sends `cmd` to the
    // middleware (which serves from imuCache, not a fresh firmware round-trip)
    // and returns the requested field. On any error / disconnect, falls back
    // to the last-known cached value, or 0 if no prior sample.
    _readImuField (cmd, field) {
        if (!this.isConnected()) {
            return Promise.resolve(this._imuCache[cmd]?.[field] ?? 0);
        }
        return this.send(cmd).then(resp => {
            if (resp && resp.status === 'ok') {
                if (cmd === 'imu_angle') {
                    this._imuCache[cmd] = {pitch: resp.pitch, roll: resp.roll, yaw: resp.yaw};
                } else {
                    this._imuCache[cmd] = {x: resp.x, y: resp.y, z: resp.z};
                }
                if (this._imuDegraded) {
                    log.info(`spark: imu recovered (${cmd})`);
                    this._imuDegraded = false;
                }
                return this._imuCache[cmd][field] ?? 0;
            }
            // Error response (or null timeout) → last-known good
            if (!this._imuDegraded) {
                log.warn(`spark: imu degraded — falling back to cached values (${resp?.error_code ?? 'timeout'})`);
                this._imuDegraded = true;
            }
            return this._imuCache[cmd]?.[field] ?? 0;
        });
    }

    // Stories 3.7/3.8/3.9 (SCP #4) — Mic/Light/TOF reporter. Branch on the
    // *response* (not a build flag, so one .scratch works on both substrates):
    //  - {status:"ok", value:<number>}  → Spark-Sensors present: return the
    //    live value, no toast.
    //  - {status:"error", error_code:"hw_not_present"} (or timeout) → no
    //    Spark-Sensors / init failed: return the declared mock 0 and show the
    //    one-shot Thai warning toast for this family (Story 3.4 fallback path).
    _readSensorField (cmd, family) {
        if (!this.isConnected()) return Promise.resolve(0);
        const fallback = () => {
            if (!this._stubWarningShown.has(family)) {
                this._stubWarningShown.add(family);
                log.warn(`spark: sensor_hw_not_present (${family}) — returning mock 0`);
                this._showStubToast(family);
            }
            return 0;
        };
        return this.send(cmd).then(resp => {
            if (resp && resp.status === 'ok' && typeof resp.value === 'number') return resp.value;
            return fallback();
        }, fallback);
    }

    // Stories 3.7/3.8/3.9 — set a HAT threshold (whenLoud/whenBright/whenNear),
    // level 1/2/3. Mirrors setShakeSensitivity. No-op (resolves null) if the
    // family is unknown or the level isn't 1-3.
    _setSensorThreshold (family, level) {
        const cmd = SENSOR_THRESHOLD_CMD[family];
        if (!cmd || ![1, 2, 3].includes(level)) return Promise.resolve(null);
        return this.send(cmd, {level});
    }

    _showStubToast (family) {
        const text = STUB_TOAST_TH[family];
        if (!text) return;
        // No native toast bus in scratch-vm yet — emit an in-VM event that the
        // scratch-gui side can subscribe to render a snackbar (downstream),
        // plus a console fallback. The once-per-family-per-session discipline
        // is enforced by the caller's _stubWarningShown Set.
        this._runtime.emit('SPARK_STUB_WARNING', {text, family});
    }

    _handleDisconnect () {
        this._stopPolling();
        this._stubWarningShown.clear(); // Story 3.4: re-arm one-shot toasts for the next session
        this._resetEdgeLatches();
        this._pending.forEach(resolve => resolve(null));
        this._pending.clear();
        this._ws = null;
        this._runtime.emit(this._runtime.constructor.PERIPHERAL_DISCONNECTED);
    }
}

class Scratch3SparkBlocks {
    static get EXTENSION_ID () {
        return EXTENSION_ID;
    }

    constructor (runtime) {
        this.runtime = runtime;
        this._peripheral = new SparkPeripheral(runtime, EXTENSION_ID);
    }

    getInfo () {
        // Re-apply our translations every time the palette is built — the GUI's
        // setLocale (which the VM forwards to format-message) replaces the whole
        // translations table, so without this our Thai strings get wiped and the
        // blocks render their English `default:` text. See applySparkTranslations.
        applySparkTranslations();
        return {
            id: EXTENSION_ID,
            name: formatMessage({id: 'spark.categoryName', default: 'Sparky', description: 'Extension name'}),
            showStatusButton: true,
            blocks: [
                // ── LED ─────────────────────────────────────────────
                {
                    opcode: 'setLedColor',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({id: 'spark.setLedColor', default: 'set LED color to [COLOR]', description: 'Set LED color'}),
                    arguments: {
                        COLOR: {
                            type: ArgumentType.STRING,
                            menu: 'ledColors',
                            defaultValue: LedColor.RED
                        }
                    }
                },
                {
                    opcode: 'setLedBrightness',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({id: 'spark.setLedBrightness', default: 'set LED brightness to [BRIGHTNESS]', description: 'Set LED brightness 0-255'}),
                    arguments: {
                        BRIGHTNESS: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 128
                        }
                    }
                },
                '---',
                // ── Button ──────────────────────────────────────────
                {
                    opcode: 'whenButtonPressed',
                    blockType: BlockType.HAT,
                    text: formatMessage({id: 'spark.whenButtonPressed', default: 'when button [BTN] pressed', description: 'Hat: when button pressed'}),
                    arguments: {
                        BTN: {
                            type: ArgumentType.STRING,
                            menu: 'buttons',
                            defaultValue: SparkButton.A
                        }
                    }
                },
                {
                    opcode: 'isButtonPressed',
                    blockType: BlockType.BOOLEAN,
                    text: formatMessage({id: 'spark.isButtonPressed', default: 'button [BTN] pressed?', description: 'Boolean: is button pressed'}),
                    arguments: {
                        BTN: {
                            type: ArgumentType.STRING,
                            menu: 'buttons',
                            defaultValue: SparkButton.A
                        }
                    }
                },
                '---',
                // ── Buzzer ──────────────────────────────────────────
                {
                    opcode: 'playTone',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({id: 'spark.playTone', default: 'play tone [FREQ] Hz for [DUR] ms', description: 'Play buzzer tone'}),
                    arguments: {
                        FREQ: {type: ArgumentType.NUMBER, defaultValue: 440},
                        DUR: {type: ArgumentType.NUMBER, defaultValue: 500}
                    }
                },
                {
                    opcode: 'stopBuzzer',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({id: 'spark.stopBuzzer', default: 'stop buzzer', description: 'Stop buzzer'})
                },
                '---',
                // ── Camera ──────────────────────────────────────────
                {
                    opcode: 'capturePhoto',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({id: 'spark.capturePhoto', default: 'capture photo to stage', description: 'Capture camera image to stage'})
                },
                '---',
                // ── IMU ─────────────────────────────────────────────
                {
                    opcode: 'imuAccelX',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({id: 'spark.imuAccelX', default: 'accel X', description: 'IMU accelerometer X axis (g)'})
                },
                {
                    opcode: 'imuAccelY',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({id: 'spark.imuAccelY', default: 'accel Y', description: 'IMU accelerometer Y axis (g)'})
                },
                {
                    opcode: 'imuAccelZ',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({id: 'spark.imuAccelZ', default: 'accel Z', description: 'IMU accelerometer Z axis (g)'})
                },
                {
                    opcode: 'imuGyroX',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({id: 'spark.imuGyroX', default: 'gyro X', description: 'IMU gyroscope X axis (deg/s)'})
                },
                {
                    opcode: 'imuGyroY',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({id: 'spark.imuGyroY', default: 'gyro Y', description: 'IMU gyroscope Y axis (deg/s)'})
                },
                {
                    opcode: 'imuGyroZ',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({id: 'spark.imuGyroZ', default: 'gyro Z', description: 'IMU gyroscope Z axis (deg/s)'})
                },
                {
                    opcode: 'imuPitch',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({id: 'spark.imuPitch', default: 'pitch', description: 'IMU tilt pitch (degrees)'})
                },
                {
                    opcode: 'imuRoll',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({id: 'spark.imuRoll', default: 'roll', description: 'IMU tilt roll (degrees)'})
                },
                {
                    // Story 3.11 — tilt-compensated magnetic heading (degrees, -180..180).
                    opcode: 'imuYaw',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({id: 'spark.imuYaw', default: 'yaw', description: 'IMU heading / yaw (degrees, -180..180)'})
                },
                {
                    // Story 3.11 — pick the orientation sensor-fusion algorithm.
                    opcode: 'setImuFusion',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'spark.setImuFusion',
                        default: 'set IMU fusion to [ALGO]',
                        description: 'Select the orientation sensor-fusion algorithm'
                    }),
                    arguments: {
                        ALGO: {
                            type: ArgumentType.STRING,
                            menu: 'fusionAlgos',
                            defaultValue: 'complementary'
                        }
                    }
                },
                '---',
                // ── IMU gesture (Story 3.3) ────────────────────────
                {
                    opcode: 'whenShake',
                    blockType: BlockType.HAT,
                    text: formatMessage({
                        id: 'spark.whenShake',
                        default: 'when shaken',
                        description: 'Hat: when board is shaken'
                    })
                },
                {
                    opcode: 'setShakeSensitivity',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'spark.setShakeSensitivity',
                        default: 'set shake sensitivity to [LEVEL]',
                        description: 'Set shake threshold level 1/2/3'
                    }),
                    arguments: {
                        LEVEL: {
                            type: ArgumentType.STRING,
                            menu: 'shakeLevels',
                            defaultValue: '2'
                        }
                    }
                },
                '---',
                // ── Spark-Sensors — Mic / Light / TOF (Stories 3.7/3.8/3.9, SCP #4) ──
                // Live on a board with the Spark-Sensors module; on a board
                // without it the reporters return mock 0 + a one-shot Thai
                // toast and the HATs stay inert (firmware sends no events). The
                // branch is on the response, so one .scratch works on both.
                {
                    opcode: 'micLevel',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({id: 'spark.micLevel', default: 'sound level', description: 'Mic level reporter (RMS)'})
                },
                {
                    opcode: 'whenLoud',
                    blockType: BlockType.HAT,
                    text: formatMessage({id: 'spark.whenLoud', default: 'when loud', description: 'Hat: when a loud sound happens'})
                },
                {
                    opcode: 'setMicThreshold',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({id: 'spark.setMicThreshold', default: 'set loud sensitivity to [LEVEL]', description: 'Set whenLoud threshold level 1/2/3'}),
                    arguments: {LEVEL: {type: ArgumentType.STRING, menu: 'sensorLevels', defaultValue: '2'}}
                },
                {
                    opcode: 'lightLevel',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({id: 'spark.lightLevel', default: 'light level', description: 'Light level reporter (lux)'})
                },
                {
                    opcode: 'whenBright',
                    blockType: BlockType.HAT,
                    text: formatMessage({id: 'spark.whenBright', default: 'when bright', description: 'Hat: when it gets bright'})
                },
                {
                    opcode: 'setLightThreshold',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({id: 'spark.setLightThreshold', default: 'set bright sensitivity to [LEVEL]', description: 'Set whenBright threshold level 1/2/3'}),
                    arguments: {LEVEL: {type: ArgumentType.STRING, menu: 'sensorLevels', defaultValue: '2'}}
                },
                {
                    opcode: 'tofDistance',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({id: 'spark.tofDistance', default: 'nearest distance', description: 'TOF distance reporter (mm; 9999 = no target)'})
                },
                {
                    opcode: 'whenNear',
                    blockType: BlockType.HAT,
                    text: formatMessage({id: 'spark.whenNear', default: 'when object near', description: 'Hat: when an object comes near'})
                },
                {
                    opcode: 'setTofThreshold',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({id: 'spark.setTofThreshold', default: 'set near sensitivity to [LEVEL]', description: 'Set whenNear threshold level 1/2/3'}),
                    arguments: {LEVEL: {type: ArgumentType.STRING, menu: 'sensorLevels', defaultValue: '2'}}
                }
            ],
            menus: {
                ledColors: {
                    acceptReporters: true,
                    items: [
                        {text: formatMessage({id: 'spark.color.red', default: 'red', description: 'LED red'}), value: LedColor.RED},
                        {text: formatMessage({id: 'spark.color.green', default: 'green', description: 'LED green'}), value: LedColor.GREEN},
                        {text: formatMessage({id: 'spark.color.yellow', default: 'yellow', description: 'LED yellow'}), value: LedColor.YELLOW},
                        {text: formatMessage({id: 'spark.color.off', default: 'off', description: 'LED off'}), value: LedColor.OFF}
                    ]
                },
                buttons: {
                    acceptReporters: true,
                    items: [
                        {text: 'A', value: SparkButton.A},
                        {text: 'B', value: SparkButton.B}
                    ]
                },
                shakeLevels: {
                    acceptReporters: true,
                    items: [
                        {
                            text: formatMessage({
                                id: 'spark.shakeLevel.1',
                                default: 'gentle',
                                description: 'Shake sensitivity level 1'
                            }),
                            value: '1'
                        },
                        {
                            text: formatMessage({
                                id: 'spark.shakeLevel.2',
                                default: 'medium',
                                description: 'Shake sensitivity level 2 (default)'
                            }),
                            value: '2'
                        },
                        {
                            text: formatMessage({
                                id: 'spark.shakeLevel.3',
                                default: 'vigorous',
                                description: 'Shake sensitivity level 3'
                            }),
                            value: '3'
                        }
                    ]
                },
                // Stories 3.7/3.8/3.9 — shared 1/2/3 sensitivity menu for the
                // whenLoud / whenBright / whenNear threshold blocks. Level 1 =
                // most sensitive (triggers easily), 3 = least.
                sensorLevels: {
                    acceptReporters: true,
                    items: [
                        {text: formatMessage({id: 'spark.sensorLevel.1', default: 'high', description: 'Sensor sensitivity level 1 (most sensitive)'}), value: '1'},
                        {text: formatMessage({id: 'spark.sensorLevel.2', default: 'medium', description: 'Sensor sensitivity level 2 (default)'}), value: '2'},
                        {text: formatMessage({id: 'spark.sensorLevel.3', default: 'low', description: 'Sensor sensitivity level 3 (least sensitive)'}), value: '3'}
                    ]
                },
                // Story 3.11 — orientation sensor-fusion algorithm for pitch/roll/yaw.
                // 'raw'/'smooth' are friendly names for none/complementary; Kalman/
                // Madgwick/Mahony keep their (proper-noun) names.
                fusionAlgos: {
                    acceptReporters: true,
                    items: [
                        {text: formatMessage({id: 'spark.fusionAlgo.none', default: 'raw', description: 'Fusion: none (accel/mag only)'}), value: 'none'},
                        {text: formatMessage({id: 'spark.fusionAlgo.complementary', default: 'smooth', description: 'Fusion: complementary (default)'}), value: 'complementary'},
                        {text: formatMessage({id: 'spark.fusionAlgo.kalman', default: 'Kalman', description: 'Fusion: 1-D Kalman'}), value: 'kalman'},
                        {text: formatMessage({id: 'spark.fusionAlgo.madgwick', default: 'Madgwick', description: 'Fusion: Madgwick'}), value: 'madgwick'},
                        {text: formatMessage({id: 'spark.fusionAlgo.mahony', default: 'Mahony', description: 'Fusion: Mahony'}), value: 'mahony'}
                    ]
                }
            }
        };
    }

    setLedColor (args) {
        const color = args.COLOR in LED_COLOR_MAP ? LED_COLOR_MAP[args.COLOR] : LED_COLOR_MAP.off;
        return this._peripheral.send('led', {pin: 2, ...color});
    }

    setLedBrightness (args) {
        const val = Math.max(0, Math.min(255, Number(args.BRIGHTNESS) || 0));
        return this._peripheral.send('pwm', {pin: 2, val});
    }

    whenButtonPressed (args) {
        if (!this._peripheral.isConnected()) return false;
        const pin = args.BTN === 'A' ? 0 : 1;
        // Story 2.3 (event-push): consume the edge latch set by btn_press.
        // Returns true ONCE per debounced press, not every frame while held.
        // Pure event path — no polling fallback. Firmware emits btn_press /
        // btn_release per pin via task_button_gpio_input (Spark-Baseboard) or
        // task_touch_input (Waveshare touchscreen, pin:0 only). The
        // isButtonPressed BOOLEAN block keeps its own polling for
        // continuous-state queries.
        if (this._peripheral._buttonEdgeLatch[pin]) {
            this._peripheral._buttonEdgeLatch[pin] = false;
            return true;
        }
        return false;
    }

    isButtonPressed (args) {
        if (!this._peripheral.isConnected()) return false;
        this._peripheral.touchButtonPoll();
        const pin = args.BTN === 'A' ? 0 : 1;
        return this._peripheral.getButtonState(pin) === 1;
    }

    playTone (args) {
        const freq = Math.max(0, Number(args.FREQ) || 0);
        const dur = Math.max(0, Number(args.DUR) || 0);
        return this._peripheral.send('buzz', {freq, dur});
    }

    stopBuzzer () {
        return this._peripheral.send('buzz', {freq: 0, dur: 0});
    }

    imuAccelX () {
        return this._peripheral._readImuField('imu_accel', 'x');
    }
    imuAccelY () {
        return this._peripheral._readImuField('imu_accel', 'y');
    }
    imuAccelZ () {
        return this._peripheral._readImuField('imu_accel', 'z');
    }
    imuGyroX () {
        return this._peripheral._readImuField('imu_gyro', 'x');
    }
    imuGyroY () {
        return this._peripheral._readImuField('imu_gyro', 'y');
    }
    imuGyroZ () {
        return this._peripheral._readImuField('imu_gyro', 'z');
    }
    imuPitch () {
        return this._peripheral._readImuField('imu_angle', 'pitch');
    }
    imuRoll () {
        return this._peripheral._readImuField('imu_angle', 'roll');
    }
    imuYaw () {
        // Story 3.11 — tilt-compensated magnetic heading (degrees, -180..180).
        return this._peripheral._readImuField('imu_angle', 'yaw');
    }
    setImuFusion (args) {
        // Story 3.11 — pick the orientation fusion algorithm at runtime.
        const algo = args.ALGO;
        if (!['none', 'complementary', 'kalman', 'madgwick', 'mahony'].includes(algo)) return Promise.resolve(null);
        return this._peripheral.send('set_imu_fusion', {algo});
    }

    whenShake () {
        if (!this._peripheral.isConnected()) return false;
        // Story 3.3 — pure event path mirroring whenButtonPressed (Story 2.3).
        // Consume the latch set by the firmware 'shake' event so the HAT fires
        // exactly once per debounced gesture. Refractory (500 ms) is enforced
        // firmware-side in task_imu_sampler; this side just edge-latches.
        if (this._peripheral._shakeEdgeLatch) {
            this._peripheral._shakeEdgeLatch = false;
            return true;
        }
        return false;
    }

    setShakeSensitivity (args) {
        const level = parseInt(args.LEVEL, 10);
        if (![1, 2, 3].includes(level)) return Promise.resolve(null);
        return this._peripheral.send('set_shake_threshold', {level});
    }

    // ── Mic / Light / TOF (Stories 3.7/3.8/3.9, SCP #4) — live on a board with
    //    Spark-Sensors; on a board without it the reporters return mock 0 + a
    //    one-shot Thai toast and the HATs stay inert (no firmware events). The
    //    branch is on the response, so the same .scratch works on both. ──
    micLevel () {
        return this._peripheral._readSensorField('mic_level', 'mic');
    }
    lightLevel () {
        return this._peripheral._readSensorField('light_level', 'light');
    }
    tofDistance () {
        return this._peripheral._readSensorField('tof_distance', 'tof');
    }
    whenLoud () {
        if (!this._peripheral.isConnected()) return false;
        if (this._peripheral._loudEdgeLatch) {
            this._peripheral._loudEdgeLatch = false; return true;
        }
        return false;
    }
    whenBright () {
        if (!this._peripheral.isConnected()) return false;
        if (this._peripheral._brightEdgeLatch) {
            this._peripheral._brightEdgeLatch = false; return true;
        }
        return false;
    }
    whenNear () {
        if (!this._peripheral.isConnected()) return false;
        if (this._peripheral._nearEdgeLatch) {
            this._peripheral._nearEdgeLatch = false; return true;
        }
        return false;
    }
    setMicThreshold (args) {
        return this._peripheral._setSensorThreshold('mic', parseInt(args.LEVEL, 10));
    }
    setLightThreshold (args) {
        return this._peripheral._setSensorThreshold('light', parseInt(args.LEVEL, 10));
    }
    setTofThreshold (args) {
        return this._peripheral._setSensorThreshold('tof', parseInt(args.LEVEL, 10));
    }

    capturePhoto () {
        return this._peripheral.send('capture', {}).then(resp => {
            if (!resp || resp.status !== 'ok' || !resp.url) return;
            return fetch(resp.url)
                .then(r => r.blob())
                .then(blob => new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                }))
                .then(dataURI => {
                    this.runtime.emit('SPARK_CAMERA_FRAME', dataURI);
                })
                .catch(err => log.warn('Spark camera capture failed:', err));
        });
    }
}

module.exports = Scratch3SparkBlocks;
