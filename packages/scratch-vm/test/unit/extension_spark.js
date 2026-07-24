const test = require('tap').test;
const Scratch3SparkBlocks = require('../../src/extensions/scratch3_spark/index.js');

// Minimal runtime stub
const fakeRuntime = {
    registerPeripheralExtension: () => {},
    emit: () => {},
    constructor: {PERIPHERAL_CONNECTED: 'PERIPHERAL_CONNECTED', PERIPHERAL_DISCONNECTED: 'PERIPHERAL_DISCONNECTED'}
};

const ext = new Scratch3SparkBlocks(fakeRuntime);

test('extension has correct ID', t => {
    t.equal(Scratch3SparkBlocks.EXTENSION_ID, 'Sparky');
    t.end();
});

test('getInfo returns expected structure', t => {
    const info = ext.getInfo();
    t.equal(info.id, 'Sparky');
    t.ok(info.name, 'has name');
    t.ok(Array.isArray(info.blocks), 'blocks is array');
    t.ok(info.menus, 'has menus');
    t.end();
});

// Regression — the connection-modal hang was an id drift: getInfo().id /
// EXTENSION_ID / the peripheral registration id must all agree, since the GUI
// scans by the same id the peripheral registered under.
test('peripheral registers under the same id as getInfo().id', t => {
    let registeredId = null;
    const capturingRuntime = {
        ...fakeRuntime,
        registerPeripheralExtension: id => {
            registeredId = id;
        }
    };
    const instance = new Scratch3SparkBlocks(capturingRuntime);
    t.equal(registeredId, Scratch3SparkBlocks.EXTENSION_ID, 'registered under EXTENSION_ID');
    t.equal(instance.getInfo().id, Scratch3SparkBlocks.EXTENSION_ID, 'getInfo().id === EXTENSION_ID');
    t.end();
});

test('getInfo contains LED blocks', t => {
    const info = ext.getInfo();
    const opcodes = info.blocks.filter(b => typeof b === 'object').map(b => b.opcode);
    t.ok(opcodes.includes('setLedColor'), 'has setLedColor');
    t.ok(opcodes.includes('setLedBrightness'), 'has setLedBrightness');
    t.end();
});

test('getInfo contains Button blocks', t => {
    const info = ext.getInfo();
    const opcodes = info.blocks.filter(b => typeof b === 'object').map(b => b.opcode);
    t.ok(opcodes.includes('whenButtonPressed'), 'has whenButtonPressed');
    t.ok(opcodes.includes('isButtonPressed'), 'has isButtonPressed');
    t.end();
});

test('getInfo contains Buzzer blocks', t => {
    const info = ext.getInfo();
    const opcodes = info.blocks.filter(b => typeof b === 'object').map(b => b.opcode);
    t.ok(opcodes.includes('playTone'), 'has playTone');
    t.ok(opcodes.includes('stopBuzzer'), 'has stopBuzzer');
    t.end();
});

test('getInfo contains Camera blocks', t => {
    const info = ext.getInfo();
    const opcodes = info.blocks.filter(b => typeof b === 'object').map(b => b.opcode);
    t.ok(opcodes.includes('capturePhoto'), 'has capturePhoto');
    t.end();
});

test('isButtonPressed returns false when not connected', t => {
    t.equal(ext.isButtonPressed({BTN: 'A'}), false);
    t.equal(ext.isButtonPressed({BTN: 'B'}), false);
    t.end();
});

test('whenButtonPressed returns false when not connected', t => {
    t.equal(ext.whenButtonPressed({BTN: 'A'}), false);
    t.equal(ext.whenButtonPressed({BTN: 'B'}), false);
    t.end();
});

// ─── Story 10.1: env-injected MIDDLEWARE_WS_URL ───────────────────────────────
//
// WS_URL is module-evaluated at require time, so each case manipulates
// global.window, busts require.cache, re-requires the module, and verifies the
// URL passed to `new WebSocket()` via a stub.

const sparkModulePath = require.resolve('../../src/extensions/scratch3_spark/index.js');

const reloadSparkExtension = () => {
    delete require.cache[sparkModulePath];
    return require('../../src/extensions/scratch3_spark/index.js');
};

class MockWebSocket {
    constructor (url) {
        MockWebSocket.lastUrl = url;
        this.readyState = 0;
        this.onopen = null;
        this.onmessage = null;
        this.onerror = null;
        this.onclose = null;
    }
    close () {}
}

const withSparkWebSocketEnv = (sparkEnv, fn) => {
    const hadWindow = Object.prototype.hasOwnProperty.call(global, 'window');
    const hadWebSocket = Object.prototype.hasOwnProperty.call(global, 'WebSocket');
    const originalWindow = global.window;
    const originalWebSocket = global.WebSocket;
    if (sparkEnv === undefined) {
        delete global.window;
    } else {
        global.window = {SPARK_ENV: sparkEnv};
    }
    global.WebSocket = MockWebSocket;
    MockWebSocket.lastUrl = null;
    try {
        const Mod = reloadSparkExtension();
        const instance = new Mod(fakeRuntime);
        instance._peripheral.scan();
        return MockWebSocket.lastUrl;
    } finally {
        if (hadWindow) {
            global.window = originalWindow;
        } else {
            delete global.window;
        }
        if (hadWebSocket) {
            global.WebSocket = originalWebSocket;
        } else {
            delete global.WebSocket;
        }
        // Bust the cache so the original `ext` consumed by other tests is
        // unaffected — and so the module re-evaluates on next require with a
        // clean global state.
        delete require.cache[sparkModulePath];
    }
};

test('Story 10.1 — WS_URL uses window.SPARK_ENV.MIDDLEWARE_WS_URL when set (K8s deployment path)', t => {
    const url = withSparkWebSocketEnv({MIDDLEWARE_WS_URL: 'wss://staging.example/ws'}, () => {});
    t.equal(url, 'wss://staging.example/ws', 'WebSocket constructed with env-injected URL');
    t.end();
});

test('Story 10.1 — WS_URL falls back to ws://localhost:8080 when window.SPARK_ENV is absent (Electron desktop path)', t => {
    const url = withSparkWebSocketEnv(undefined, () => {});
    t.equal(url, 'ws://localhost:8080', 'WebSocket constructed with localhost fallback URL');
    t.end();
});

// ── Story 2.8 — address the two physical LEDs independently ──
test('setLedColor per-LED index: both omits index, led1→0, led2→1', t => {
    const sent = [];
    const inst = new Scratch3SparkBlocks(fakeRuntime);
    inst._peripheral.send = (cmd, data) => {
        sent.push({cmd, data});
        return Promise.resolve({});
    };
    inst.setLedColor({WHICH: 'both', COLOR: 'red'});
    inst.setLedColor({WHICH: 'led1', COLOR: 'green'});
    inst.setLedColor({WHICH: 'led2', COLOR: 'amber'});
    t.equal(sent[0].cmd, 'led', 'cmd is led');
    t.same(sent[0].data, {pin: 2, r: 255, g: 0, b: 0}, 'both → no index (drives both, backward-compatible)');
    t.same(sent[1].data, {pin: 2, r: 0, g: 255, b: 0, index: 0}, 'led1 → index 0');
    t.same(sent[2].data, {pin: 2, r: 100, g: 255, b: 0, index: 1}, 'led2 → index 1 (amber = bench-tuned {100,255,0})');
    t.end();
});

test('ledTargets menu + Thai translations are single-source (Story 2.8)', t => {
    const info = ext.getInfo();
    t.same(info.menus.ledTargets.items.map(i => i.value), ['both', 'led1', 'led2'], 'menu values');
    const th = require('../../src/extensions/scratch3_spark/translations.js').th;
    info.menus.ledTargets.items.forEach(i => t.ok(th[`spark.ledTarget.${i.value}`], `has spark.ledTarget.${i.value}`));
    t.end();
});

test('setLedBrightness per-LED index (Story 2.8) + amber bench-tuning', t => {
    const sent = [];
    const inst = new Scratch3SparkBlocks(fakeRuntime);
    inst._peripheral.send = (cmd, data) => { sent.push({cmd, data}); return Promise.resolve({}); };
    inst.setLedBrightness({WHICH: 'both', BRIGHTNESS: 200});
    inst.setLedBrightness({WHICH: 'led1', BRIGHTNESS: 50});
    inst.setLedBrightness({WHICH: 'led2', BRIGHTNESS: 255});
    t.equal(sent[0].cmd, 'pwm', 'cmd is pwm');
    t.same(sent[0].data, {pin: 2, val: 200}, 'both → no index');
    t.same(sent[1].data, {pin: 2, val: 50, index: 0}, 'led1 → index 0');
    t.same(sent[2].data, {pin: 2, val: 255, index: 1}, 'led2 → index 1');
    t.end();
});
