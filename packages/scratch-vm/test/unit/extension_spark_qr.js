// extension_spark_qr.js — Story 12.6 QR card-sensing Scratch blocks.
// Drives the opcode handlers + the qr_seen event path against a stubbed
// peripheral.send (no real socket): the qr_scan_enable wire shape, the
// whenScanned edge-latch (exact-after-trim, once per sighting), the
// lastScannedText reporter cache/reset, and the FR45 one-shot fallback toast.
const test = require('tap').test;
const Scratch3SparkBlocks = require('../../src/extensions/scratch3_spark/index.js');
const translations = require('../../src/extensions/scratch3_spark/translations.js');

const makeExt = (opts = {}) => {
    const emits = [];
    const runtime = {
        registerPeripheralExtension: () => {},
        emit: (ev, payload) => emits.push({ev, payload}),
        constructor: {PERIPHERAL_CONNECTED: 'c', PERIPHERAL_DISCONNECTED: 'd'}
    };
    const ext = new Scratch3SparkBlocks(runtime);
    const sent = [];
    let responder = opts.responder || (() => ({status: 'ok'}));
    ext._peripheral.isConnected = () => opts.connected !== false;
    ext._peripheral.send = (cmd, data) => {
        sent.push({cmd, data});
        return Promise.resolve(responder(cmd, data));
    };
    return {ext, sent, emits};
};

test('getInfo exposes the QR opcodes + qrScanState menu', t => {
    const {ext} = makeExt();
    const info = ext.getInfo();
    const opcodes = info.blocks.filter(b => typeof b === 'object').map(b => b.opcode);
    ['setQrScan', 'whenScanned', 'lastScannedText'].forEach(op => t.ok(opcodes.includes(op), `has ${op}`));
    t.same(info.menus.qrScanState.items.map(i => i.value), ['on', 'off']);
    t.end();
});

test('single-source: every QR label + menu value has a Thai translation key', t => {
    const {ext} = makeExt();
    const info = ext.getInfo();
    const th = translations.th;
    ['spark.setQrScan', 'spark.whenScanned', 'spark.lastScannedText'].forEach(k => t.ok(th[k], k));
    info.menus.qrScanState.items.forEach(i => t.ok(th[`spark.qrScanState.${i.value}`], `qrScanState.${i.value}`));
    t.end();
});

test('setQrScan on/off sends qr_scan_enable {enable}', async t => {
    const {ext, sent} = makeExt();
    t.teardown(() => ext._peripheral._clearQrHintTimer());
    await ext.setQrScan({STATE: 'on'});
    t.equal(sent[0].cmd, 'qr_scan_enable');
    t.same(sent[0].data, {enable: true});
    await ext.setQrScan({STATE: 'off'});
    t.same(sent[1].data, {enable: false});
    t.end();
});

test('lastScannedText is empty before any scan; caches the trimmed payload after qr_seen', t => {
    const {ext} = makeExt();
    t.equal(ext.lastScannedText(), '', 'empty before first scan');
    ext._peripheral._onEvent({event: 'qr_seen', text: '  เสือ  '});
    t.equal(ext.lastScannedText(), 'เสือ', 'trimmed cache');
    t.end();
});

test('whenScanned fires exactly once for the matching trimmed text, not for others', t => {
    const {ext} = makeExt();
    ext._peripheral._onEvent({event: 'qr_seen', text: 'เสือ'});
    t.equal(ext.whenScanned({TEXT: '  เสือ  '}), true, 'matches after trim, fires once');
    t.equal(ext.whenScanned({TEXT: 'เสือ'}), false, 'consumed — does not re-fire on the same sighting');
    // a different card
    ext._peripheral._onEvent({event: 'qr_seen', text: 'ช้าง'});
    t.equal(ext.whenScanned({TEXT: 'เสือ'}), false, 'other HAT does not fire for a different card');
    t.equal(ext.whenScanned({TEXT: 'ช้าง'}), true, 'the matching HAT fires');
    t.end();
});

test('whenScanned returns false when disconnected', t => {
    const {ext} = makeExt({connected: false});
    ext._peripheral._onEvent({event: 'qr_seen', text: 'เสือ'});
    t.equal(ext.whenScanned({TEXT: 'เสือ'}), false);
    t.end();
});

test('disconnect resets the reporter + clears the sighting latch (FR43)', t => {
    const {ext} = makeExt();
    ext._peripheral._onEvent({event: 'qr_seen', text: 'เสือ'});
    t.equal(ext.lastScannedText(), 'เสือ');
    ext._peripheral._resetEdgeLatches();
    t.equal(ext.lastScannedText(), '', 'reporter reset on disconnect');
    t.equal(ext.whenScanned({TEXT: 'เสือ'}), false, 'stale sighting cannot fire after reset');
    t.end();
});

test('FR45 fallback: a scanner-less board shows the one-shot QR toast', async t => {
    const {ext, emits} = makeExt({responder: () => ({status: 'error', error_code: 'camera_error'})});
    await ext.setQrScan({STATE: 'on'});
    await ext.setQrScan({STATE: 'on'}); // second time must NOT re-toast
    const warnings = emits.filter(e => e.ev === 'SPARK_STUB_WARNING' && e.payload.family === 'qr');
    t.equal(warnings.length, 1, 'toast shown exactly once per session');
    t.match(warnings[0].payload.text, /QR/, 'the QR-specific copy');
    t.end();
});

test('FR45: disconnected board sends nothing and the reporter stays mock-empty', async t => {
    const {ext, sent} = makeExt({connected: false});
    const r = await ext.setQrScan({STATE: 'on'});
    t.equal(r, null, 'send short-circuits to null when disconnected');
    t.equal(sent.length, 0, 'no command written');
    t.equal(ext.lastScannedText(), '', 'reporter mock-empty');
    t.end();
});

// ── Story 12.3 capability handshake gating ──────────────────────────────────
test('12.3: a board that announced features but lacks qr_scan → toast, no send', async t => {
    const {ext, sent, emits} = makeExt();
    ext._peripheral._capabilities = new Set(['gpio', 'imu']); // announced, no qr_scan
    const r = await ext.setQrScan({STATE: 'on'});
    t.equal(r, null, 'gated before send');
    t.equal(sent.length, 0, 'no qr_scan_enable written');
    const warnings = emits.filter(e => e.ev === 'SPARK_STUB_WARNING' && e.payload.family === 'qr');
    t.equal(warnings.length, 1, 'one-shot QR toast');
    t.end();
});

test('12.3: a board WITH qr_scan capability sends normally', async t => {
    const {ext, sent} = makeExt();
    t.teardown(() => ext._peripheral._clearQrHintTimer());
    ext._peripheral._capabilities = new Set(['gpio', 'camera', 'qr_scan']);
    await ext.setQrScan({STATE: 'on'});
    t.equal(sent[0].cmd, 'qr_scan_enable');
    t.end();
});

test('12.3: a legacy board (capabilities unknown) still sends — backward compatible', async t => {
    const {ext, sent} = makeExt();
    t.teardown(() => ext._peripheral._clearQrHintTimer());
    ext._peripheral._capabilities = null; // pre-handshake firmware
    await ext.setQrScan({STATE: 'on'});
    t.equal(sent[0].cmd, 'qr_scan_enable', 'legacy board: block still works');
    t.end();
});
