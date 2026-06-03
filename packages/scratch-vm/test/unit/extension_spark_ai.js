// extension_spark_ai.js — Story 4.5 on-device AI (ai.classify) Scratch blocks.
// Drives the opcode handlers against a stubbed peripheral.send (no real socket),
// asserting the wire request shape, the returned label, aiConfidence, and the
// FR28 graceful-degradation fallback (mock label + one-shot SPARK_STUB_WARNING).
const test = require('tap').test;
const Scratch3SparkBlocks = require('../../src/extensions/scratch3_spark/index.js');

// Build a Spark extension with a stubbed peripheral.send + a recording runtime.
const makeExt = (opts = {}) => {
    const emits = [];
    const runtime = {
        registerPeripheralExtension: () => {},
        emit: (ev, payload) => emits.push({ev, payload}),
        constructor: {PERIPHERAL_CONNECTED: 'c', PERIPHERAL_DISCONNECTED: 'd'}
    };
    const ext = new Scratch3SparkBlocks(runtime);
    const sent = [];
    let responder = opts.responder || (() => ({status: 'ok', label: 'x', confidence: 0.5}));
    ext._peripheral.isConnected = () => opts.connected !== false;
    ext._peripheral.send = (cmd, data) => {
        sent.push({cmd, data});
        return Promise.resolve(responder(cmd, data));
    };
    const setResponder = r => {
        responder = r;
    };
    return {
        ext,
        sent,
        emits,
        setResponder
    };
};

test('getInfo exposes the 5 AI opcodes + aiColorTargets menu', t => {
    const {ext} = makeExt();
    const info = ext.getInfo();
    const opcodes = info.blocks.filter(b => typeof b === 'object').map(b => b.opcode);
    ['aiClassifyFace', 'aiClassifyColor', 'aiClassifyMotion', 'aiClassifyImuGesture', 'aiConfidence']
        .forEach(op => t.ok(opcodes.includes(op), `has ${op}`));
    t.ok(info.menus.aiColorTargets, 'has aiColorTargets menu');
    t.same(info.menus.aiColorTargets.items.map(i => i.value), ['any', 'red', 'green', 'blue', 'yellow']);
    t.end();
});

test('aiClassifyColor sends {primitive:color, params:{target}} and returns the label + confidence', async t => {
    const {ext, sent} = makeExt({
        responder: () => ({status: 'ok', primitive: 'color', label: 'red', confidence: 0.92, bbox: [1, 2, 3, 4]})
    });
    const label = await ext.aiClassifyColor({TARGET: 'red'});
    t.equal(label, 'red');
    t.equal(sent[0].cmd, 'ai.classify');
    t.same(sent[0].data, {primitive: 'color', params: {target: 'red'}});
    t.equal(ext.aiConfidence(), 0.92, 'aiConfidence reads the last result');
    t.end();
});

test('aiClassifyColor TARGET=any → params.target null (dominant)', async t => {
    const {ext, sent} = makeExt({responder: () => ({status: 'ok', label: 'green', confidence: 0.5})});
    await ext.aiClassifyColor({TARGET: 'any'});
    t.same(sent[0].data, {primitive: 'color', params: {target: null}});
    t.end();
});

test('aiClassifyFace returns face_count label', async t => {
    const {ext, sent} = makeExt({responder: () => ({status: 'ok', label: 'face_count_2', confidence: 0.8})});
    const label = await ext.aiClassifyFace();
    t.equal(label, 'face_count_2');
    t.same(sent[0].data, {primitive: 'face', params: {}});
    t.end();
});

test('motion + imu_gesture send the right params', async t => {
    const {ext, sent} = makeExt({responder: () => ({status: 'ok', label: 'still', confidence: 0})});
    await ext.aiClassifyMotion();
    t.same(sent[0].data, {primitive: 'motion', params: {threshold_pct: 20}});
    await ext.aiClassifyImuGesture();
    t.same(sent[1].data, {primitive: 'imu_gesture', params: {gesture: null}});
    t.end();
});

test('FR28: error response → mock label + ONE SPARK_STUB_WARNING per session', async t => {
    const {ext, emits} = makeExt({responder: () => ({status: 'error', error_code: 'model_load_failed'})});
    const face = await ext.aiClassifyFace();
    const color = await ext.aiClassifyColor({TARGET: 'red'});
    t.equal(face, 'face_count_0', 'face mock');
    t.equal(color, 'not_found', 'color mock');
    const warnings = emits.filter(e => e.ev === 'SPARK_STUB_WARNING');
    t.equal(warnings.length, 1, 'toast shown once (family ai), not per-call');
    t.equal(warnings[0].payload.family, 'ai');
    t.end();
});

test('timeout (null response) → mock label, no throw', async t => {
    const {ext} = makeExt({responder: () => null});
    const label = await ext.aiClassifyMotion();
    t.equal(label, 'still');
    t.end();
});

test('not connected → mock label, send NOT called', async t => {
    const {ext, sent} = makeExt({connected: false});
    const label = await ext.aiClassifyFace();
    t.equal(label, 'face_count_0');
    t.equal(sent.length, 0, 'no send when disconnected');
    t.end();
});
