// extension_spark_facerec.js — Story 4.9 (FR58) face-recognition block.
//
// Three properties are worth testing here and they are not equally obvious:
//   1. the block asks the right question and returns the opaque slot label;
//   2. it degrades to person_none rather than erroring (FR28) — a project written
//      against face_id must still run on a board without the capability;
//   3. it is sent with a LONGER timeout than the other AI blocks. That is not a
//      style choice: recognition measured ~2.75 s on board v2 (bench 2026-08-06,
//      worst sample 2,832 ms) against the shared 3 s default, so the default would
//      have expired intermittently and shown a mock label as if the board had
//      answered. A regression here is silent and looks like flaky hardware, which
//      is exactly the kind of bug a test should be holding down.
const test = require('tap').test;
const Scratch3SparkBlocks = require('../../src/extensions/scratch3_spark/index.js');
const translations = require('../../src/extensions/scratch3_spark/translations.js');

// Records the timeout argument too — the stub in extension_spark_ai.js ignores it.
const makeExt = (opts = {}) => {
    const emits = [];
    const runtime = {
        registerPeripheralExtension: () => {},
        emit: (ev, payload) => emits.push({ev, payload}),
        constructor: {PERIPHERAL_CONNECTED: 'c', PERIPHERAL_DISCONNECTED: 'd'}
    };
    const ext = new Scratch3SparkBlocks(runtime);
    const sent = [];
    const responder = opts.responder || (() => ({status: 'ok', label: 'person_1', confidence: 0.9}));
    ext._peripheral.isConnected = () => opts.connected !== false;
    ext._peripheral.send = (cmd, data, timeoutMs) => {
        sent.push({cmd, data, timeoutMs});
        return Promise.resolve(responder(cmd, data));
    };
    return {ext, sent, emits};
};

test('getInfo exposes aiClassifyFaceId and it takes no arguments', t => {
    const {ext} = makeExt();
    const block = ext.getInfo().blocks.filter(b => typeof b === 'object')
        .find(b => b.opcode === 'aiClassifyFaceId');
    t.ok(block, 'block is registered');
    // No arguments by design: a block that could name or select a person would put
    // personal data inside the .sb3 file children share.
    t.notOk(block.arguments, 'no arguments');
    t.end();
});

test('the Thai label warns about the ~3 s wait', t => {
    const th = translations.th['spark.aiClassifyFaceId'];
    t.ok(th, 'has a Thai label');
    t.match(th, /3/, 'the label mentions the duration — a 3 s block reads as a hang without it');
    t.end();
});

test('sends {primitive:face_id, params:{}} and returns the slot label', async t => {
    const {ext, sent} = makeExt({
        responder: () => ({status: 'ok', primitive: 'face_id', label: 'person_2', confidence: 0.88})
    });
    const label = await ext.aiClassifyFaceId();
    t.equal(label, 'person_2');
    t.equal(sent[0].cmd, 'ai.classify');
    t.same(sent[0].data, {primitive: 'face_id', params: {}});
    t.equal(ext.aiConfidence(), 0.88, 'aiConfidence reads the recognition result');
    t.end();
});

test('face_id is sent with a longer timeout than the 3 s default', async t => {
    const {ext, sent} = makeExt();
    await ext.aiClassifyFaceId();
    t.ok(sent[0].timeoutMs > 3000,
        `timeout ${sent[0].timeoutMs} ms must exceed the 3 s default — recognition takes ~2.75 s`);
    // Must also clear the agreed p95 budget (3,500 ms, Story 4.9 AC3) with margin,
    // and stay above the middleware's 6 s router timeout for this primitive so the
    // block receives a real error instead of giving up first.
    t.ok(sent[0].timeoutMs >= 6000, 'at least the middleware router timeout for face_id');
    t.end();
});

test('the other AI blocks keep the 3 s default', async t => {
    const {ext, sent} = makeExt({responder: () => ({status: 'ok', label: 'face_count_1', confidence: 0.7})});
    await ext.aiClassifyFace();
    t.ok(sent[0].timeoutMs === undefined || sent[0].timeoutMs === 3000,
        'detection is unchanged by Story 4.9');
    t.end();
});

test('FR28: no camera / capability absent → person_none plus a one-shot toast', async t => {
    const {ext, emits} = makeExt({
        responder: () => ({status: 'error', error_code: 'hw_not_present'})
    });
    const label = await ext.aiClassifyFaceId();
    t.equal(label, 'person_none',
        'degrades to "I recognise nobody" — the same answer as an empty enrolment store');
    t.equal(emits.filter(e => e.ev === 'SPARK_STUB_WARNING').length, 1, 'one toast');
    t.end();
});

test('FR28: a firmware without the command (invalid_cmd) degrades the same way', async t => {
    const {ext} = makeExt({responder: () => ({status: 'error', error_code: 'invalid_cmd'})});
    t.equal(await ext.aiClassifyFaceId(), 'person_none');
    t.end();
});

test('FR28: a board that never answers degrades instead of hanging the script', async t => {
    const {ext} = makeExt({responder: () => null});
    t.equal(await ext.aiClassifyFaceId(), 'person_none');
    t.end();
});

test('disconnected board returns person_none without touching the wire', async t => {
    const {ext, sent} = makeExt({connected: false});
    t.equal(await ext.aiClassifyFaceId(), 'person_none');
    t.equal(sent.length, 0, 'nothing sent');
    t.end();
});

test('no block exposes enrolment (AC6 — the extension side of the rule)', t => {
    const {ext} = makeExt();
    const opcodes = ext.getInfo().blocks.filter(b => typeof b === 'object').map(b => b.opcode);
    // The middleware refuses faceEnroll/faceForget on this channel regardless; this
    // asserts the extension never even offers the affordance.
    opcodes.forEach(op => {
        t.notMatch(op, /enrol|enroll|forget/i, `${op} is not an enrolment affordance`);
    });
    t.end();
});
