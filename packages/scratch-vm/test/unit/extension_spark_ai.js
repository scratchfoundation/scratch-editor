// extension_spark_ai.js — Story 4.5 on-device AI (ai.classify) Scratch blocks.
// Drives the opcode handlers against a stubbed peripheral.send (no real socket),
// asserting the wire request shape, the returned label, aiConfidence/aiBbox, and the
// FR28 graceful-degradation fallback (mock label + one-shot SPARK_STUB_WARNING).
const test = require('tap').test;
const Scratch3SparkBlocks = require('../../src/extensions/scratch3_spark/index.js');
const translations = require('../../src/extensions/scratch3_spark/translations.js');

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
    return {ext, sent, emits, setResponder};
};

test('getInfo exposes the 6 AI opcodes + AI menus', t => {
    const {ext} = makeExt();
    const info = ext.getInfo();
    const opcodes = info.blocks.filter(b => typeof b === 'object').map(b => b.opcode);
    ['aiClassifyFace', 'aiClassifyColor', 'aiClassifyMotion', 'aiClassifyImuGesture', 'aiConfidence', 'aiBbox']
        .forEach(op => t.ok(opcodes.includes(op), `has ${op}`));
    t.same(info.menus.aiColorTargets.items.map(i => i.value), ['any', 'red', 'green', 'blue', 'yellow']);
    t.same(info.menus.aiGestures.items.map(i => i.value), ['any', 'shake', 'tilt', 'flat', 'flip']);
    t.same(info.menus.aiBboxFields.items.map(i => i.value), ['x', 'y', 'w', 'h']);
    t.end();
});

test('single-source: every AI menu value has a Thai translation key', t => {
    const {ext} = makeExt();
    const info = ext.getInfo();
    const th = translations.th;
    info.menus.aiColorTargets.items.forEach(i => t.ok(th[`spark.aiColor.${i.value}`], `aiColor.${i.value}`));
    info.menus.aiGestures.items.forEach(i => t.ok(th[`spark.aiGesture.${i.value}`], `aiGesture.${i.value}`));
    info.menus.aiBboxFields.items.forEach(i => t.ok(th[`spark.aiBboxField.${i.value}`], `aiBboxField.${i.value}`));
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

test('AC3: aiClassifyMotion THRESHOLD arg is passed + clamped 0..100 (default 50)', async t => {
    const {ext, sent} = makeExt({responder: () => ({status: 'ok', label: 'still', confidence: 0})});
    await ext.aiClassifyMotion({THRESHOLD: 70});
    t.same(sent[0].data, {primitive: 'motion', params: {threshold_pct: 70}}, 'passes the arg');
    await ext.aiClassifyMotion({THRESHOLD: 150});
    t.equal(sent[1].data.params.threshold_pct, 100, 'clamps high');
    await ext.aiClassifyMotion({THRESHOLD: -5});
    t.equal(sent[2].data.params.threshold_pct, 0, 'clamps low');
    await ext.aiClassifyMotion({THRESHOLD: undefined});
    t.equal(sent[3].data.params.threshold_pct, 50, 'defaults to 50 on non-numeric');
    t.end();
});

test('AC3: aiClassifyImuGesture GESTURE arg → params.gesture (any→null)', async t => {
    const {ext, sent} = makeExt({responder: () => ({status: 'ok', label: 'shake', confidence: 0.7})});
    await ext.aiClassifyImuGesture({GESTURE: 'shake'});
    t.same(sent[0].data, {primitive: 'imu_gesture', params: {gesture: 'shake'}});
    await ext.aiClassifyImuGesture({GESTURE: 'any'});
    t.same(sent[1].data, {primitive: 'imu_gesture', params: {gesture: null}}, 'any → null');
    t.end();
});

test('AC4: aiBbox reads x/y/w/h of the last detection; 0 when no bbox', async t => {
    const {ext} = makeExt({
        responder: () => ({status: 'ok', label: 'face_count_1', confidence: 0.9, bbox: [10, 20, 30, 40]})
    });
    await ext.aiClassifyFace();
    t.equal(ext.aiBbox({FIELD: 'x'}), 10);
    t.equal(ext.aiBbox({FIELD: 'y'}), 20);
    t.equal(ext.aiBbox({FIELD: 'w'}), 30);
    t.equal(ext.aiBbox({FIELD: 'h'}), 40);
    // no-bbox response → 0
    const {ext: ext2} = makeExt({responder: () => ({status: 'ok', label: 'face_count_0', confidence: 0})});
    await ext2.aiClassifyFace();
    t.equal(ext2.aiBbox({FIELD: 'x'}), 0, 'no bbox → 0');
    t.end();
});

test('companion cache is coherent with the LAST block run (degrade does not leave stale confidence/bbox)', async t => {
    const {ext, setResponder} = makeExt({
        responder: () => ({status: 'ok', label: 'face_count_1', confidence: 0.8, bbox: [1, 2, 3, 4]})
    });
    await ext.aiClassifyFace();
    t.equal(ext.aiConfidence(), 0.8, 'good result cached');
    t.equal(ext.aiBbox({FIELD: 'x'}), 1);
    // now a degraded call (error) must reset the companions to the mock state
    setResponder(() => ({status: 'error', error_code: 'hw_not_present'}));
    const label = await ext.aiClassifyColor({TARGET: 'red'});
    t.equal(label, 'not_found', 'color degrades to mock');
    t.equal(ext.aiConfidence(), 0, 'confidence NOT stale (0 for the degraded call)');
    t.equal(ext.aiBbox({FIELD: 'x'}), 0, 'bbox NOT stale');
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
    const label = await ext.aiClassifyMotion({THRESHOLD: 50});
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
