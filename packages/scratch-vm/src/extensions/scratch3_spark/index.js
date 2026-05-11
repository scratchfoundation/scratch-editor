const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const formatMessage = require('format-message');
const log = require('../../util/log');

const translations = require('./translations');
formatMessage.setup({translations: {th: translations.th}});

const EXTENSION_ID = 'spark';
const WS_URL = 'ws://localhost:8080';
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
        if (this._ws) {
            this._ws.close();
            this._ws = null;
        }
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
                    this._imuCache[cmd] = {pitch: resp.pitch, roll: resp.roll};
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

    _handleDisconnect () {
        this._stopPolling();
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
        return {
            id: EXTENSION_ID,
            name: formatMessage({id: 'spark.categoryName', default: 'Spark', description: 'Extension name'}),
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
