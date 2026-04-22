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
    t.equal(Scratch3SparkBlocks.EXTENSION_ID, 'spark');
    t.end();
});

test('getInfo returns expected structure', t => {
    const info = ext.getInfo();
    t.equal(info.id, 'spark');
    t.ok(info.name, 'has name');
    t.ok(Array.isArray(info.blocks), 'blocks is array');
    t.ok(info.menus, 'has menus');
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
