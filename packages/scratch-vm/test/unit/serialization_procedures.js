const test = require('tap').test;
const sb3 = require('../../src/serialization/sb3');

/**
 * Minimal SB3 blocks for a procedure with one string argument, in old format
 * (shadow prototype and shadow argument reporter, as saved by scratch-blocks v1).
 * Includes a block attached after the define, matching the conditions from the
 * bug report.
 */
const makeOldFormatBlocks = () => ({
    define_id: {
        opcode: 'procedures_definition',
        next: 'attached_id',
        parent: null,
        inputs: {custom_block: [1, 'proto_id']},
        fields: {},
        shadow: false,
        topLevel: true,
        x: 0,
        y: 0
    },
    proto_id: {
        opcode: 'procedures_prototype',
        next: null,
        parent: 'define_id',
        inputs: {arg_id: [1, 'reporter_id']},
        fields: {},
        shadow: true,
        topLevel: false,
        mutation: {
            tagName: 'mutation',
            children: [],
            proccode: 'my block %s',
            argumentids: '["arg_id"]',
            argumentnames: '["x"]',
            argumentdefaults: '[""]',
            warp: 'false'
        }
    },
    reporter_id: {
        opcode: 'argument_reporter_string_number',
        next: null,
        parent: 'proto_id',
        inputs: {},
        fields: {VALUE: ['x', null]},
        shadow: true,
        topLevel: false
    },
    attached_id: {
        opcode: 'motion_movesteps',
        next: null,
        parent: 'define_id',
        inputs: {},
        fields: {},
        shadow: false,
        topLevel: false
    }
});

/**
 * Same procedure in new format (non-shadow prototype, no argument reporter blocks).
 */
const makeNewFormatBlocks = () => ({
    define_id: {
        opcode: 'procedures_definition',
        next: 'attached_id',
        parent: null,
        inputs: {custom_block: [2, 'proto_id']},
        fields: {},
        shadow: false,
        topLevel: true,
        x: 0,
        y: 0
    },
    proto_id: {
        opcode: 'procedures_prototype',
        next: null,
        parent: 'define_id',
        inputs: {},
        fields: {},
        shadow: false,
        topLevel: false,
        mutation: {
            tagName: 'mutation',
            children: [],
            proccode: 'my block %s',
            argumentids: '["arg_id"]',
            argumentnames: '["x"]',
            argumentdefaults: '[""]',
            warp: 'false'
        }
    },
    attached_id: {
        opcode: 'motion_movesteps',
        next: null,
        parent: 'define_id',
        inputs: {},
        fields: {},
        shadow: false,
        topLevel: false
    }
});

const EXPECTED_OPCODES = [
    'motion_movesteps',
    'procedures_definition',
    'procedures_prototype'
].sort();

const getOpcodes = blocks => Object.values(blocks)
    .map(b => b.opcode)
    .sort();

test('deserializeBlocks: strips argument reporters from procedures_prototype (old format)', t => {
    const result = sb3.deserializeBlocks(makeOldFormatBlocks());

    t.same(getOpcodes(result), EXPECTED_OPCODES,
        'argument reporter is stripped; definition, prototype, and attached block remain');

    t.equal(result.proto_id.shadow, false, 'prototype is not shadow');
    t.same(result.proto_id.inputs, {}, 'prototype inputs are empty');
    t.equal(result.define_id.inputs.custom_block.shadow, null,
        'definition custom_block input shadow reference is cleared');

    t.end();
});

test('deserializeBlocks: leaves procedure blocks unchanged when already in new format', t => {
    const result = sb3.deserializeBlocks(makeNewFormatBlocks());

    t.same(getOpcodes(result), EXPECTED_OPCODES,
        'definition, prototype, and attached block are all present');

    t.equal(result.proto_id.shadow, false, 'prototype is not shadow');
    t.same(result.proto_id.inputs, {}, 'prototype inputs are empty');

    t.end();
});

test('procedures block hierarchy is preserved across a serialize/deserialize round-trip (old format)', t => {
    const deserialized = sb3.deserializeBlocks(makeOldFormatBlocks());
    const [serialized] = sb3.serializeBlocks(deserialized);
    const roundTripped = sb3.deserializeBlocks(serialized);

    t.same(getOpcodes(roundTripped), EXPECTED_OPCODES,
        'same block opcodes after round-trip, no extra blocks accumulated');

    t.equal(roundTripped.proto_id.shadow, false, 'prototype is still not shadow after round-trip');
    t.same(roundTripped.proto_id.inputs, {}, 'prototype inputs still empty after round-trip');
    t.equal(roundTripped.define_id.inputs.custom_block.shadow, null,
        'definition input shadow still null after round-trip');

    t.end();
});

test('procedures block hierarchy is preserved across a serialize/deserialize round-trip (new format)', t => {
    const deserialized = sb3.deserializeBlocks(makeNewFormatBlocks());
    const [serialized] = sb3.serializeBlocks(deserialized);
    const roundTripped = sb3.deserializeBlocks(serialized);

    t.same(getOpcodes(roundTripped), EXPECTED_OPCODES,
        'same block opcodes after round-trip');

    t.end();
});
