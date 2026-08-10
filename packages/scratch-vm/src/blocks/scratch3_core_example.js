const BlockType = require('../extension-support/block-type');

/**
 * Minimal built-in test extension for the Scratch mod.
 */
class Scratch3CoreExample {
    constructor (runtime) {
        this.runtime = runtime;
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo () {
        return {
            id: 'coreExample',
            name: 'Test',
            blocks: [
                {
                    opcode: 'doNothing',
                    blockType: BlockType.COMMAND,
                    text: 'do nothing'
                }
            ]
        };
    }

    doNothing () {
        return;
    }
}

module.exports = Scratch3CoreExample;
