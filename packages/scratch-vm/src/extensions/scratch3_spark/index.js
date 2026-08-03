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

// SINGLE SOURCE OF TRUTH for LED colors (R3 2026-05-18, supersedes the
// R2/SCP-2026-05-08 closed enum). Add/raise a color = ONE row here + one
// `spark.color.<name>` line in translations.js. The block menu, default,
// and message-ids all derive from this map. Bi-color red+green matrix:
// firmware ignores b — keep b:0 and express colors as red/green mixes.
const LED_COLOR_MAP = {
    red: {r: 255, g: 0, b: 0},
    green: {r: 0, g: 255, b: 0},
    amber: {r: 100, g: 255, b: 0},   // bench-tuned for the red+green LED (2026-05-17); NOT web-amber {255,191,0}, which reads too red on this hardware
    off: {r: 0, g: 0, b: 0}
};
const LED_COLOR_NAMES = Object.keys(LED_COLOR_MAP);
const ledColorMenuItems = () => LED_COLOR_NAMES.map(name => ({
    text: formatMessage({
        id: `spark.color.${name}`,
        default: name,
        description: `LED color ${name}`
    }),
    value: name
}));

// Story 2.8 — which physical LED to address (single source). 'both' → no wire
// `index` field (drives both LEDs, backward-compatible); 'led1'/'led2' → the
// firmware's optional `index` 0/1. The board has two bi-color LEDs.
const LED_TARGETS = [
    {value: 'both', index: null},
    {value: 'led1', index: 0},
    {value: 'led2', index: 1}
];
const ledTargetMenuItems = () => LED_TARGETS.map(t => ({
    text: formatMessage({id: `spark.ledTarget.${t.value}`, default: t.value, description: `LED target ${t.value}`}),
    value: t.value
}));

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
    tof: 'เซ็นเซอร์ระยะยังไม่พร้อม - แสดงค่าจำลอง 0',
    // Story 4.5 — AI (ai.classify) not ready on this board (no camera / model not
    // loaded / inference timeout). One-shot per session; reporter returns a mock label.
    ai: 'AI ยังไม่พร้อม - แสดงผลจำลอง',
    // Story 12.6 (FR45) — QR scanner not available on this board (no camera /
    // capability). One-shot per session; the reporter returns '' (mock).
    qr: 'เครื่องสแกน QR ยังไม่พร้อม - แสดงผลจำลอง'
};

// Story 12.6 (FR49 editor side) — one-shot hint when scanning is ON but nothing
// has decoded for QR_HINT_MS; emitted on the same SPARK_STUB_WARNING bus.
const QR_NO_DECODE_HINT_TH = 'ลองขยับการ์ดเข้าใกล้อีกนิด';
const QR_HINT_MS = 5000;

// Map a sensor family to its firmware threshold cmd (whenLoud/whenBright/whenNear).
const SENSOR_THRESHOLD_CMD = {
    mic: 'set_mic_threshold',
    light: 'set_light_threshold',
    tof: 'set_tof_threshold'
};

// Story 4.5 — AI color-target menu (single source, like LED_COLOR_MAP). 'any' →
// params.target:null (firmware reports the dominant color). Add a target = one row
// here + one `spark.aiColor.<name>` line in translations.js.
const AI_COLOR_TARGETS = ['any', 'red', 'green', 'blue', 'yellow'];
const aiColorMenuItems = () => AI_COLOR_TARGETS.map(name => ({
    text: formatMessage({id: `spark.aiColor.${name}`, default: name, description: `AI color target ${name}`}),
    value: name
}));
// Story 4.5 — AI imu_gesture menu (single source; mirrors AI_COLOR_TARGETS). 'any' →
// params.gesture:null (firmware recognizes any). Non-'any' values match the firmware
// gesture_classify vocabulary (Story 4.2, incl. 'flip'). Add a gesture = one row here +
// one `spark.aiGesture.<name>` line in translations.js.
const AI_GESTURE_TARGETS = ['any', 'shake', 'tilt', 'flat', 'flip'];
const aiGestureMenuItems = () => AI_GESTURE_TARGETS.map(name => ({
    text: formatMessage({id: `spark.aiGesture.${name}`, default: name, description: `AI gesture target ${name}`}),
    value: name
}));
// Story 4.5 — face bbox field accessor menu ([x,y,w,h] → one numeric field).
const AI_BBOX_FIELDS = ['x', 'y', 'w', 'h'];
const aiBboxMenuItems = () => AI_BBOX_FIELDS.map(name => ({
    text: formatMessage({id: `spark.aiBboxField.${name}`, default: name, description: `AI bbox field ${name}`}),
    value: name
}));
// Mock label returned by each AI reporter when the board can't run inference
// (so a .scratch project keeps working / degrades gracefully — FR28).
const AI_MOCK_LABEL = {
    face: 'face_count_0',
    color: 'not_found',
    motion: 'still',
    imu_gesture: 'none'
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
        // Story 4.5 — last ai.classify result {label, confidence, bbox, primitive};
        // the classify reporters return the label, aiConfidence reads confidence.
        this._lastAi = null;
        // Story 12.6 (Epic 12 QR) — last decoded QR text (FR43 reporter cache;
        // '' before any scan, reset on disconnect) + the most recent unconsumed
        // sighting for the whenScanned HAT (FR42, edge-latch mirror of _shakeEdgeLatch).
        this._lastScannedText = '';
        this._qrPending = null;
        // FR49 editor side — "nothing decoded for a while" one-shot hint bookkeeping.
        this._qrHintTimer = null;
        this._qrHintShown = false;
        // Story 12.3 (FR48) — the board's announced capability Set, queried at
        // connect. null = unknown/legacy firmware (pre-handshake) → blocks are NOT
        // gated (backward compat); a Set that lacks 'qr_scan' → FR45 fallback.
        this._capabilities = null;
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
            this._queryCapabilities(); // Story 12.3 — learn the board's feature set
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
        // Story 12.6 — clear the QR sighting latch + reset the reporter (FR43:
        // reset on disconnect) + stop any pending decode-hint timer.
        this._qrPending = null;
        this._lastScannedText = '';
        this._clearQrHintTimer();
        // Story 12.3 — forget the announced capabilities; re-queried on reconnect.
        this._capabilities = null;
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
        } else if (msg.event === 'qr_seen') {
            // Story 12.6 (FR42/FR43) — cache the latest text for the reporter and
            // record the sighting for the whenScanned HAT (exact-match-after-trim,
            // consumed once). Firmware enforces the 500 ms per-payload refractory.
            const text = typeof msg.text === 'string' ? msg.text.trim() : '';
            this._lastScannedText = text;
            this._qrPending = {text};
            this._noteQrDecode();
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

    // Story 4.5 — run an ai.classify primitive. Sends {primitive, params}; on a
    // success response caches {label, confidence, bbox} and returns the label.
    // Branch on the RESPONSE (not a build flag) so one .scratch works everywhere:
    // hw_not_present (no camera) / model_load_failed (primitive not built) /
    // inference_timeout / null timeout → return the declared mock label + a
    // one-shot Thai 'ai' toast (FR28 graceful degradation, never a Scratch error).
    _classify (primitive, params) {
        const mock = AI_MOCK_LABEL[primitive] ?? 'not_found';
        // Cache the mock as the last result so the companion reporters
        // (aiConfidence / aiBbox) stay coherent with the block that just ran —
        // otherwise a degraded call leaves a previous success's confidence/bbox
        // stale (Story 4.5 code-review, 2026-07-25).
        const cacheMock = () => {
            this._lastAi = {label: mock, confidence: 0, bbox: null, primitive};
            return mock;
        };
        if (!this.isConnected()) return Promise.resolve(cacheMock());
        const fallback = resp => {
            if (!this._stubWarningShown.has('ai')) {
                this._stubWarningShown.add('ai');
                log.warn(`spark: ai_not_ready (${primitive}/${resp?.error_code ?? 'timeout'}) — mock label`);
                this._showStubToast('ai');
            }
            return cacheMock();
        };
        return this.send('ai.classify', {primitive, params}).then(resp => {
            if (resp && resp.status === 'ok' && typeof resp.label === 'string') {
                this._lastAi = {
                    label: resp.label,
                    confidence: typeof resp.confidence === 'number' ? resp.confidence : 0,
                    bbox: Array.isArray(resp.bbox) ? resp.bbox : null,
                    primitive
                };
                return resp.label;
            }
            return fallback(resp);
        }, () => fallback(null));
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

    // Story 12.6 (FR49 editor) — one-shot "nothing decoded" hint while scanning.
    // The timer is (re)armed when scanning turns on and cancelled by any decode;
    // if it elapses first, the hint fires once. Same one-shot bus as the toasts.
    _startQrHintTimer () {
        this._clearQrHintTimer();
        this._qrHintShown = false;
        this._qrHintTimer = setTimeout(() => {
            this._qrHintTimer = null;
            if (!this._qrHintShown) {
                this._qrHintShown = true;
                this._runtime.emit('SPARK_STUB_WARNING', {text: QR_NO_DECODE_HINT_TH, family: 'qrHint'});
            }
        }, QR_HINT_MS);
    }
    _noteQrDecode () {
        // A card decoded — cancel the pending "nothing decoded" hint.
        this._clearQrHintTimer();
    }
    _clearQrHintTimer () {
        if (this._qrHintTimer) {
            clearTimeout(this._qrHintTimer);
            this._qrHintTimer = null;
        }
    }

    // Story 12.3 (FR48) — ask the board for its capability list at connect. A
    // pre-handshake firmware answers invalid_cmd (or times out → null) → we stay
    // in "unknown/legacy" mode and never gate a block (backward compatible).
    _queryCapabilities () {
        this.send('capabilities').then(resp => {
            this._capabilities = (resp && resp.status === 'ok' && Array.isArray(resp.capabilities))
                ? new Set(resp.capabilities)
                : null;
        }, () => {
            this._capabilities = null;
        });
    }

    // Story 12.3/12.6 — true only when the board announced its features AND the
    // set lacks the queried capability. Unknown/legacy (null) → false (don't gate).
    _lacksCapability (name) {
        return this._capabilities !== null && !this._capabilities.has(name);
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
                // ══ OUTPUTS ══════════════════════════════════════════
                // ── LED ─────────────────────────────────────────────
                {
                    opcode: 'setLedColor',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({id: 'spark.setLedColor', default: 'set LED [WHICH] color to [COLOR]', description: 'Set LED color (which LED + color)'}),
                    arguments: {
                        WHICH: {
                            type: ArgumentType.STRING,
                            menu: 'ledTargets',
                            defaultValue: 'both'
                        },
                        COLOR: {
                            type: ArgumentType.STRING,
                            menu: 'ledColors',
                            defaultValue: 'red'
                        }
                    }
                },
                {
                    opcode: 'setLedBrightness',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({id: 'spark.setLedBrightness', default: 'set LED [WHICH] brightness to [BRIGHTNESS]', description: 'Set LED brightness 0-255 (which LED + level)'}),
                    arguments: {
                        WHICH: {
                            type: ArgumentType.STRING,
                            menu: 'ledTargets',
                            defaultValue: 'both'
                        },
                        BRIGHTNESS: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 128
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
                // ══ major break: OUTPUTS → SENSORS / INPUTS (double '---' = wider gap) ══
                '---',
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
                // ── Motion · Accelerometer ──────────────────────────
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
                '---',
                // ── Motion · Gyroscope ──────────────────────────────
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
                '---',
                // ── Motion · Angle ──────────────────────────────────
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
                '---',
                // ── Motion · Shake gesture + Fusion (Story 3.3 / 3.11) ──
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
                // ── Sound (microphone) ──────────────────────────────
                {
                    opcode: 'whenLoud',
                    blockType: BlockType.HAT,
                    text: formatMessage({id: 'spark.whenLoud', default: 'when loud', description: 'Hat: when a loud sound happens'})
                },
                {
                    opcode: 'micLevel',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({id: 'spark.micLevel', default: 'sound level', description: 'Mic level reporter (0..100 sound level, dB-mapped from the mic RMS in firmware)'})
                },
                {
                    opcode: 'setMicThreshold',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({id: 'spark.setMicThreshold', default: 'set loud sensitivity to [LEVEL]', description: 'Set whenLoud threshold level 1/2/3'}),
                    arguments: {LEVEL: {type: ArgumentType.STRING, menu: 'sensorLevels', defaultValue: '2'}}
                },
                '---',
                // ── Light ───────────────────────────────────────────
                {
                    opcode: 'whenBright',
                    blockType: BlockType.HAT,
                    text: formatMessage({id: 'spark.whenBright', default: 'when bright', description: 'Hat: when it gets bright'})
                },
                {
                    opcode: 'lightLevel',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({id: 'spark.lightLevel', default: 'light level', description: 'Light level reporter (lux)'})
                },
                {
                    opcode: 'setLightThreshold',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({id: 'spark.setLightThreshold', default: 'set bright sensitivity to [LEVEL]', description: 'Set whenBright threshold level 1/2/3'}),
                    arguments: {LEVEL: {type: ArgumentType.STRING, menu: 'sensorLevels', defaultValue: '2'}}
                },
                '---',
                // ── Distance (time-of-flight) ───────────────────────
                {
                    opcode: 'whenNear',
                    blockType: BlockType.HAT,
                    text: formatMessage({id: 'spark.whenNear', default: 'when object near', description: 'Hat: when an object comes near'})
                },
                {
                    opcode: 'tofDistance',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({id: 'spark.tofDistance', default: 'nearest distance', description: 'TOF distance reporter (mm; 9999 = no target)'})
                },
                {
                    opcode: 'setTofThreshold',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({id: 'spark.setTofThreshold', default: 'set near sensitivity to [LEVEL]', description: 'Set whenNear threshold level 1/2/3'}),
                    arguments: {LEVEL: {type: ArgumentType.STRING, menu: 'sensorLevels', defaultValue: '2'}}
                },
                // ══ major break: SENSORS → CAMERA (M3 module, delivered later) ══
                '---',
                '---',
                // ── Camera (M3 — not in the M2 deliverable) ─────────
                {
                    opcode: 'capturePhoto',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({id: 'spark.capturePhoto', default: 'capture photo to stage', description: 'Capture camera image to stage'})
                },
                '---',
                // ── On-device AI (ai.classify — Stories 4.2/4.3/4.4 firmware) ───────
                // REPORTERS returning the inference label; aiConfidence reads the last
                // result's confidence. On a board that can't run a primitive the reporter
                // returns a mock label + a one-shot Thai toast (FR28) — never an error.
                {
                    opcode: 'aiClassifyFace',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'spark.aiClassifyFace',
                        default: 'detect face',
                        description: 'AI: on-device face detection (label face_count_N)'
                    })
                },
                {
                    opcode: 'aiClassifyColor',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'spark.aiClassifyColor',
                        default: 'detect color [TARGET]',
                        description: 'AI: on-device color detection'
                    }),
                    arguments: {
                        TARGET: {type: ArgumentType.STRING, menu: 'aiColorTargets', defaultValue: 'any'}
                    }
                },
                {
                    opcode: 'aiClassifyMotion',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'spark.aiClassifyMotion',
                        default: 'detect motion (sensitivity [THRESHOLD])',
                        description: 'AI: on-device motion detection (motion_detected/still)'
                    }),
                    arguments: {
                        THRESHOLD: {type: ArgumentType.NUMBER, defaultValue: 50}
                    }
                },
                {
                    opcode: 'aiClassifyImuGesture',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'spark.aiClassifyImuGesture',
                        default: 'detect gesture [GESTURE]',
                        description: 'AI: on-device IMU-gesture (the camera-free AI floor)'
                    }),
                    arguments: {
                        GESTURE: {type: ArgumentType.STRING, menu: 'aiGestures', defaultValue: 'any'}
                    }
                },
                {
                    opcode: 'aiConfidence',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'spark.aiConfidence',
                        default: 'AI confidence',
                        description: 'Confidence (0..1) of the last AI detection'
                    })
                },
                {
                    opcode: 'aiBbox',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'spark.aiBbox',
                        default: 'AI box [FIELD]',
                        description: 'Read x/y/w/h of the last AI detection bbox'
                    }),
                    arguments: {
                        FIELD: {type: ArgumentType.STRING, menu: 'aiBboxFields', defaultValue: 'x'}
                    }
                },
                // ── QR card sensing (Epic 12 — Stories 12.4/12.6) ───
                // Neutral primitives only: turn scanning on/off, a HAT that fires
                // on a chosen text, and a reporter with the latest text. No game
                // semantics, no card-name dropdown, no pack concept (FR44 design).
                '---',
                {
                    opcode: 'setQrScan',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({id: 'spark.setQrScan', default: 'turn QR scanning [STATE]', description: 'Start/stop QR card scanning'}),
                    arguments: {STATE: {type: ArgumentType.STRING, menu: 'qrScanState', defaultValue: 'on'}}
                },
                {
                    opcode: 'whenScanned',
                    blockType: BlockType.HAT,
                    text: formatMessage({id: 'spark.whenScanned', default: 'when scanned [TEXT]', description: 'Hat: fires when a QR card with this exact text is scanned'}),
                    arguments: {TEXT: {type: ArgumentType.STRING, defaultValue: 'เสือ'}}
                },
                {
                    opcode: 'lastScannedText',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({id: 'spark.lastScannedText', default: 'last scanned text', description: 'Reporter: the most recently decoded QR text (empty before any scan)'})
                }
            ],
            menus: {
                ledColors: {
                    acceptReporters: true,
                    items: ledColorMenuItems()
                },
                // Story 2.8 — which physical LED (both / LED 1 / LED 2).
                ledTargets: {
                    acceptReporters: false,
                    items: ledTargetMenuItems()
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
                // Story 12.6 — QR scanning on/off menu.
                qrScanState: {
                    acceptReporters: false,
                    items: [
                        {text: formatMessage({id: 'spark.qrScanState.on', default: 'on', description: 'Start QR scanning'}), value: 'on'},
                        {text: formatMessage({id: 'spark.qrScanState.off', default: 'off', description: 'Stop QR scanning'}), value: 'off'}
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
                },
                // Story 4.5 — AI color-target menu (single source: AI_COLOR_TARGETS).
                aiColorTargets: {
                    acceptReporters: true,
                    items: aiColorMenuItems()
                },
                // Story 4.5 — AI imu_gesture menu (single source: AI_GESTURE_TARGETS).
                aiGestures: {
                    acceptReporters: true,
                    items: aiGestureMenuItems()
                },
                // Story 4.5 — face bbox field accessor menu (AI_BBOX_FIELDS).
                aiBboxFields: {
                    acceptReporters: false,
                    items: aiBboxMenuItems()
                }
            }
        };
    }

    setLedColor (args) {
        const color = args.COLOR in LED_COLOR_MAP ? LED_COLOR_MAP[args.COLOR] : LED_COLOR_MAP.off;
        // Story 2.8 — 'both' (default) omits `index` (both LEDs, backward-compatible);
        // 'led1'/'led2' add the firmware's per-LED index 0/1.
        const target = LED_TARGETS.find(t => t.value === args.WHICH);
        const payload = {pin: 2, ...color};
        if (target && target.index !== null) payload.index = target.index;
        return this._peripheral.send('led', payload);
    }

    setLedBrightness (args) {
        const val = Math.max(0, Math.min(255, Number(args.BRIGHTNESS) || 0));
        // Story 2.8 — 'both' (default) omits index; 'led1'/'led2' → per-LED brightness.
        const target = LED_TARGETS.find(t => t.value === args.WHICH);
        const payload = {pin: 2, val};
        if (target && target.index !== null) payload.index = target.index;
        return this._peripheral.send('pwm', payload);
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

    // ── On-device AI (ai.classify) — Story 4.5. Each reporter returns the inference
    //    label; graceful fallback to a mock label + one-shot Thai toast on a board
    //    that can't run the primitive (FR28). aiConfidence reads the last result. ──
    aiClassifyFace () {
        return this._peripheral._classify('face', {});
    }
    aiClassifyColor (args) {
        const target = args.TARGET === 'any' ? null : args.TARGET;
        return this._peripheral._classify('color', {target});
    }
    aiClassifyMotion (args) {
        // AC3: user-settable sensitivity, clamped 0..100 (default 50).
        const raw = Math.round(Number(args.THRESHOLD));
        const threshold = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 50;
        return this._peripheral._classify('motion', {threshold_pct: threshold});
    }
    aiClassifyImuGesture (args) {
        // AC3: 'any' → null (firmware recognizes any); else the selected gesture.
        const gesture = args.GESTURE === 'any' ? null : args.GESTURE;
        return this._peripheral._classify('imu_gesture', {gesture});
    }
    aiConfidence () {
        return this._peripheral._lastAi ? this._peripheral._lastAi.confidence : 0;
    }
    aiBbox (args) {
        // AC4: read x/y/w/h of the last detection's bbox (0 when no bbox cached).
        const bb = this._peripheral._lastAi && this._peripheral._lastAi.bbox;
        if (!Array.isArray(bb)) return 0;
        const idx = AI_BBOX_FIELDS.indexOf(args.FIELD);
        return idx >= 0 && typeof bb[idx] === 'number' ? bb[idx] : 0;
    }

    // ── QR card sensing (Epic 12 — Stories 12.4/12.6) ──────────────────────
    setQrScan (args) {
        // No board → no-op (no toast: "no scanner" is only meaningful on a
        // connected board; mirrors the sensor reporters' isConnected guard).
        if (!this._peripheral.isConnected()) return Promise.resolve(null);
        // Story 12.3/FR45 — a board that announced its features but lacks qr_scan
        // (e.g. camera-less substrate): one-shot Thai toast, no command sent. This
        // is DISTINCT from the no-board case above (which is silent). A legacy
        // board (capabilities unknown) falls through and relies on the response-
        // based fallback below.
        if (this._peripheral._lacksCapability('qr_scan')) {
            if (!this._peripheral._stubWarningShown.has('qr')) {
                this._peripheral._stubWarningShown.add('qr');
                this._peripheral._showStubToast('qr');
            }
            return Promise.resolve(null);
        }
        const enable = args.STATE === 'on';
        // Arm/cancel the FR49 "nothing decoded" hint alongside the command.
        if (enable) this._peripheral._startQrHintTimer();
        else this._peripheral._clearQrHintTimer();
        return this._peripheral.send('qr_scan_enable', {enable}).then(resp => {
            // FR45 — board without a working scanner (no camera / camera_error /
            // hw_not_present): one-shot Thai toast, mock behavior (the reporter
            // returns '' and the HAT stays inert). One .scratch works on both.
            if (enable && (!resp || resp.status !== 'ok')) {
                this._peripheral._clearQrHintTimer();
                if (!this._peripheral._stubWarningShown.has('qr')) {
                    this._peripheral._stubWarningShown.add('qr');
                    this._peripheral._showStubToast('qr');
                }
            }
            return resp;
        }, () => {});
    }
    whenScanned (args) {
        if (!this._peripheral.isConnected()) return false;
        // FR42 — exact match after whitespace trim, consumed once per sighting
        // (edge-latch, mirror of whenShake). Different targets don't fire.
        const target = String(args.TEXT).trim();
        const p = this._peripheral._qrPending;
        if (p && p.text === target) {
            this._peripheral._qrPending = null;
            return true;
        }
        return false;
    }
    lastScannedText () {
        // FR43 — synchronous cache like aiConfidence; '' before any scan.
        return this._peripheral._lastScannedText;
    }
}

module.exports = Scratch3SparkBlocks;
