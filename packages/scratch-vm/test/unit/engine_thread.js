const test = require('tap').test;
const Thread = require('../../src/engine/thread');
const RenderedTarget = require('../../src/sprites/rendered-target');
const Sprite = require('../../src/sprites/sprite');
const Runtime = require('../../src/engine/runtime');

test('spec', t => {
    t.type(Thread, 'function');

    const th = new Thread('arbitraryString');
    t.type(th, 'object');
    t.ok(th instanceof Thread);
    t.type(th.pushStack, 'function');
    t.type(th.reuseStackForNextBlock, 'function');
    t.type(th.popStack, 'function');
    t.type(th.stopThisScript, 'function');
    t.type(th.peekStack, 'function');
    t.type(th.peekStackFrame, 'function');
    t.type(th.peekParentStackFrame, 'function');
    t.type(th.pushReportedValue, 'function');
    t.type(th.initParams, 'function');
    t.type(th.pushParam, 'function');
    t.type(th.peekStack, 'function');
    t.type(th.getParam, 'function');
    t.type(th.atStackTop, 'function');
    t.type(th.goToNextBlock, 'function');
    t.type(th.isRecursiveCall, 'function');

    t.end();
});

test('pushStack', t => {
    const th = new Thread('arbitraryString');
    th.pushStack('arbitraryString');

    t.end();
});

test('popStack', t => {
    const th = new Thread('arbitraryString');
    th.pushStack('arbitraryString');
    t.equal(th.popStack(), 'arbitraryString');
    t.equal(th.popStack(), undefined);

    t.end();
});

test('atStackTop', t => {
    const th = new Thread('arbitraryString');
    th.pushStack('arbitraryString');
    th.pushStack('secondString');
    t.equal(th.atStackTop(), false);
    th.popStack();
    t.equal(th.atStackTop(), true);

    t.end();
});

test('reuseStackForNextBlock', t => {
    const th = new Thread('arbitraryString');
    th.pushStack('arbitraryString');
    th.reuseStackForNextBlock('secondString');
    t.equal(th.popStack(), 'secondString');

    t.end();
});

test('peekStackFrame', t => {
    const th = new Thread('arbitraryString');
    th.pushStack('arbitraryString');
    t.equal(th.peekStackFrame().warpMode, false);
    th.popStack();
    t.equal(th.peekStackFrame(), null);

    t.end();
});

test('peekParentStackFrame', t => {
    const th = new Thread('arbitraryString');
    th.pushStack('arbitraryString');
    th.peekStackFrame().warpMode = true;
    t.equal(th.peekParentStackFrame(), null);
    th.pushStack('secondString');
    t.equal(th.peekParentStackFrame().warpMode, true);

    t.end();
});

test('pushReportedValue', t => {
    const th = new Thread('arbitraryString');
    th.pushStack('arbitraryString');
    th.pushStack('secondString');
    th.pushReportedValue('value');
    t.equal(th.justReported, 'value');

    t.end();
});

test('peekStack', t => {
    const th = new Thread('arbitraryString');
    th.pushStack('arbitraryString');
    t.equal(th.peekStack(), 'arbitraryString');
    th.popStack();
    t.equal(th.peekStack(), null);

    t.end();
});

test('PushGetParam', t => {
    const th = new Thread('arbitraryString');
    th.pushStack('arbitraryString');
    th.initParams();
    th.pushParam('testParam', 'testValue');
    t.equal(th.peekStackFrame().params.testParam, 'testValue');
    t.equal(th.getParam('testParam'), 'testValue');
    // Params outside of define stack always evaluate to null
    t.equal(th.getParam('nonExistentParam'), null);

    t.end();
});

test('goToNextBlock', t => {
    const th = new Thread('arbitraryString');
    const r = new Runtime();
    const s = new Sprite(null, r);
    const rt = new RenderedTarget(s, r);
    const block1 = {fields: Object,
        id: 'arbitraryString',
        inputs: Object,
        STEPS: Object,
        block: 'fakeBlock',
        name: 'STEPS',
        next: 'secondString',
        opcode: 'motion_movesteps',
        parent: null,
        shadow: false,
        topLevel: true,
        x: 0,
        y: 0
    };
    const block2 = {fields: Object,
        id: 'secondString',
        inputs: Object,
        STEPS: Object,
        block: 'fakeBlock',
        name: 'STEPS',
        next: null,
        opcode: 'procedures_call',
        mutation: {proccode: 'fakeCode'},
        parent: null,
        shadow: false,
        topLevel: true,
        x: 0,
        y: 0
    };

    rt.blocks.createBlock(block1);
    rt.blocks.createBlock(block2);
    rt.blocks.createBlock(block2);
    th.target = rt;

    t.equal(th.peekStack(), null);
    th.pushStack('secondString');
    t.equal(th.peekStack(), 'secondString');
    th.goToNextBlock();
    t.equal(th.peekStack(), null);
    th.pushStack('secondString');
    th.pushStack('arbitraryString');
    t.equal(th.peekStack(), 'arbitraryString');
    th.goToNextBlock();
    t.equal(th.peekStack(), 'secondString');
    th.goToNextBlock();
    t.equal(th.peekStack(), null);

    t.end();
});

test('stopThisScript', t => {
    const th = new Thread('arbitraryString');
    const r = new Runtime();
    const s = new Sprite(null, r);
    const rt = new RenderedTarget(s, r);
    const block1 = {fields: Object,
        id: 'arbitraryString',
        inputs: Object,
        STEPS: Object,
        block: 'fakeBlock',
        name: 'STEPS',
        next: null,
        opcode: 'motion_movesteps',
        parent: null,
        shadow: false,
        topLevel: true,
        x: 0,
        y: 0
    };
    const block2 = {fields: Object,
        id: 'secondString',
        inputs: Object,
        STEPS: Object,
        block: 'fakeBlock',
        name: 'STEPS',
        next: null,
        opcode: 'procedures_call',
        mutation: {proccode: 'fakeCode'},
        parent: null,
        shadow: false,
        topLevel: true,
        x: 0,
        y: 0
    };

    rt.blocks.createBlock(block1);
    rt.blocks.createBlock(block2);
    th.target = rt;

    th.stopThisScript();
    t.equal(th.peekStack(), null);
    th.pushStack('arbitraryString');
    t.equal(th.peekStack(), 'arbitraryString');
    th.stopThisScript();
    t.equal(th.peekStack(), null);
    th.pushStack('arbitraryString');
    th.pushStack('secondString');
    th.stopThisScript();
    t.equal(th.peekStack(), 'secondString');

    t.end();
});

test('isRecursiveCall', t => {
    const th = new Thread('arbitraryString');
    const r = new Runtime();
    const s = new Sprite(null, r);
    const rt = new RenderedTarget(s, r);
    const block1 = {fields: Object,
        id: 'arbitraryString',
        inputs: Object,
        STEPS: Object,
        block: 'fakeBlock',
        name: 'STEPS',
        next: null,
        opcode: 'motion_movesteps',
        parent: null,
        shadow: false,
        topLevel: true,
        x: 0,
        y: 0
    };
    const block2 = {fields: Object,
        id: 'secondString',
        inputs: Object,
        STEPS: Object,
        block: 'fakeBlock',
        name: 'STEPS',
        next: null,
        opcode: 'procedures_call',
        mutation: {proccode: 'fakeCode'},
        parent: null,
        shadow: false,
        topLevel: true,
        x: 0,
        y: 0
    };

    rt.blocks.createBlock(block1);
    rt.blocks.createBlock(block2);
    th.target = rt;

    t.equal(th.isRecursiveCall('fakeCode'), false);
    th.pushStack('secondString');
    t.equal(th.isRecursiveCall('fakeCode'), false);
    th.pushStack('arbitraryString');
    t.equal(th.isRecursiveCall('fakeCode'), true);
    th.pushStack('arbitraryString');
    t.equal(th.isRecursiveCall('fakeCode'), true);
    th.popStack();
    t.equal(th.isRecursiveCall('fakeCode'), true);
    th.popStack();
    t.equal(th.isRecursiveCall('fakeCode'), false);
    th.popStack();
    t.equal(th.isRecursiveCall('fakeCode'), false);

    t.end();
});
