import defineDynamicBlock from '../../../src/lib/define-dynamic-block';

import BlockType from '@scratch/scratch-vm/src/extension-support/block-type';

const MockScratchBlocks = {
    OUTPUT_SHAPE_HEXAGONAL: 1,
    OUTPUT_SHAPE_ROUND: 2,
    OUTPUT_SHAPE_SQUARE: 3
};

const categoryInfo = {
    name: 'motion category',
    id: 'motion'
};

const penIconURI = 'data:image/svg+xml;base64,fake_pen_icon_svg_base64_data';

const testBlockInfo = {
    commandWithIcon: {
        blockType: BlockType.COMMAND,
        blockIconURI: penIconURI,
        text: 'command with icon'
    },
    commandWithoutIcon: {
        blockType: BlockType.COMMAND,
        text: 'command without icon'
    },
    terminalCommand: {
        blockType: BlockType.COMMAND,
        isTerminal: true,
        text: 'terminal command'
    },
    reporter: {
        blockType: BlockType.REPORTER,
        text: 'reporter'
    },
    boolean: {
        blockType: BlockType.BOOLEAN,
        text: 'Boolean'
    },
    hat: {
        blockType: BlockType.HAT,
        text: 'hat'
    }
};

// similar to goog.mixin from the Closure library
const mixin = function (target, source) {
    for (const x in source) {
        target[x] = source[x];
    }
};

class MockBlock {
    constructor (blockInfo, extendedOpcode) {
        // mimic Closure-style inheritance by mixing in `defineDynamicBlock` output as this instance's prototype
        // see also the `Blockly.Block` constructor
        const prototype = defineDynamicBlock(MockScratchBlocks, categoryInfo, blockInfo, extendedOpcode);
        mixin(this, prototype);
        this.init();

        // bootstrap the mutation<->DOM cycle
        this.blockInfoText = JSON.stringify(blockInfo);
        const xmlElement = this.mutationToDom();

        // parse blockInfo from XML to fill dynamic properties
        this.domToMutation(xmlElement);
    }

    jsonInit (json) {
        this.result = Object.assign({}, json);
    }
    interpolate () {
        // TODO: add tests for this?
    }
    setOutput (isEnabled) {
        this.result.outputConnection = isEnabled; // Blockly calls `makeConnection_` here
    }
    setOutputShape (outputShape) {
        this.result.outputShape_ = outputShape;
    }
    setNextStatement (isEnabled) {
        this.result.nextConnection = isEnabled; // Blockly calls `makeConnection_` here
    }
    setPreviousStatement (isEnabled) {
        this.result.previousConnection = isEnabled; // Blockly calls `makeConnection_` here
    }
}

describe('defineDynamicBlock Blockly API contract', () => {
    // These tests verify that the Blockly Block methods used by
    // defineDynamicBlock actually exist on the scratch-blocks export.
    // If Blockly renames or removes an API, these will fail before
    // production does.
    let BlockProto;
    beforeAll(() => {
        // eslint-disable-next-line global-require
        BlockProto = require('scratch-blocks').Block.prototype;
    });

    test('Block methods used in domToMutation exist', () => {
        expect(typeof BlockProto.jsonInit).toBe('function');
        expect(typeof BlockProto.setOutput).toBe('function');
        expect(typeof BlockProto.setOutputShape).toBe('function');
        expect(typeof BlockProto.setPreviousStatement).toBe('function');
        expect(typeof BlockProto.setNextStatement).toBe('function');
        expect(typeof BlockProto.interpolate).toBe('function');
    });
});

describe('defineDynamicBlock', () => {
    test('is a function', () => {
        expect(typeof defineDynamicBlock).toBe('function');
    });
    test('can define a command block with an icon', () => {
        const extendedOpcode = 'test.commandWithIcon';
        const block = new MockBlock(testBlockInfo.commandWithIcon, extendedOpcode);
        expect(block.result).toEqual({
            category: categoryInfo.name,
            style: categoryInfo.id,
            extensions: ['scratch_extension'],
            inputsInline: true,
            nextConnection: true,
            outputShape_: MockScratchBlocks.OUTPUT_SHAPE_SQUARE,
            previousConnection: true,
            type: extendedOpcode
        });
    });
    test('can define a command block without an icon', () => {
        const extendedOpcode = 'test.commandWithoutIcon';
        const block = new MockBlock(testBlockInfo.commandWithoutIcon, extendedOpcode);
        expect(block.result).toEqual({
            category: categoryInfo.name,
            style: categoryInfo.id,
            // extensions: undefined, // no icon means no extension
            inputsInline: true,
            nextConnection: true,
            outputShape_: MockScratchBlocks.OUTPUT_SHAPE_SQUARE,
            previousConnection: true,
            type: extendedOpcode
        });
    });
    test('can define a terminal command', () => {
        const extendedOpcode = 'test.terminal';
        const block = new MockBlock(testBlockInfo.terminalCommand, extendedOpcode);
        expect(block.result).toEqual({
            category: categoryInfo.name,
            style: categoryInfo.id,
            // extensions: undefined, // no icon means no extension
            inputsInline: true,
            nextConnection: false, // terminal
            outputShape_: MockScratchBlocks.OUTPUT_SHAPE_SQUARE,
            previousConnection: true,
            type: extendedOpcode
        });
    });
    test('can define a reporter', () => {
        const extendedOpcode = 'test.reporter';
        const block = new MockBlock(testBlockInfo.reporter, extendedOpcode);
        expect(block.result).toEqual({
            category: categoryInfo.name,
            style: categoryInfo.id,
            // extensions: undefined, // no icon means no extension
            inputsInline: true,
            // nextConnection: undefined, // reporter
            outputConnection: true, // reporter
            outputShape_: MockScratchBlocks.OUTPUT_SHAPE_ROUND, // reporter
            // previousConnection: undefined, // reporter
            type: extendedOpcode
        });
        expect(block.checkboxInFlyout).toBe(true);
    });
    test('can define a Boolean', () => {
        const extendedOpcode = 'test.boolean';
        const block = new MockBlock(testBlockInfo.boolean, extendedOpcode);
        expect(block.result).toEqual({
            category: categoryInfo.name,
            style: categoryInfo.id,
            // checkboxInFlyout_: undefined,
            // extensions: undefined, // no icon means no extension
            inputsInline: true,
            // nextConnection: undefined, // reporter
            outputConnection: true, // reporter
            outputShape_: MockScratchBlocks.OUTPUT_SHAPE_HEXAGONAL, // Boolean
            // previousConnection: undefined, // reporter
            type: extendedOpcode
        });
    });
    test('can define a hat', () => {
        const extendedOpcode = 'test.hat';
        const block = new MockBlock(testBlockInfo.hat, extendedOpcode);
        expect(block.result).toEqual({
            category: categoryInfo.name,
            style: categoryInfo.id,
            // extensions: undefined, // no icon means no extension
            inputsInline: true,
            nextConnection: true,
            outputShape_: MockScratchBlocks.OUTPUT_SHAPE_SQUARE,
            // previousConnection: undefined, // hat
            type: extendedOpcode
        });
    });
});
