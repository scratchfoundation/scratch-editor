const test = require('tap').test;
const path = require('path');
const VirtualMachine = require('../../src/index');
const Runtime = require('../../src/engine/runtime');
const sb3 = require('../../src/serialization/sb3');
const readFileToBuffer = require('../fixtures/readProjectFile').readFileToBuffer;
const exampleProjectPath = path.resolve(__dirname, '../fixtures/clone-cleanup.sb2');
const commentsSB2ProjectPath = path.resolve(__dirname, '../fixtures/comments.sb2');
const commentsSB3ProjectPath = path.resolve(__dirname, '../fixtures/comments.sb3');
const commentsSB3NoDupeIds = path.resolve(__dirname, '../fixtures/comments_no_duplicate_id_serialization.sb3');
const variableReporterSB2ProjectPath = path.resolve(__dirname, '../fixtures/top-level-variable-reporter.sb2');
const topLevelReportersProjectPath = path.resolve(__dirname, '../fixtures/top-level-reporters.sb3');
const draggableSB3ProjectPath = path.resolve(__dirname, '../fixtures/draggable.sb3');
const originSB3ProjectPath = path.resolve(__dirname, '../fixtures/origin.sb3');
const originAbsentSB3ProjectPath = path.resolve(__dirname, '../fixtures/origin-absent.sb3');
const FakeRenderer = require('../fixtures/fake-renderer');

test('serialize', t => {
    const vm = new VirtualMachine();
    vm.loadProject(readFileToBuffer(exampleProjectPath))
        .then(() => {
            const result = sb3.serialize(vm.runtime);
            // @todo Analyze
            t.type(JSON.stringify(result), 'string');
            t.end();
        });
});

test('deserialize', t => {
    const vm = new VirtualMachine();
    sb3.deserialize('', vm.runtime).then(({targets}) => {
        // @todo Analyze
        t.type(targets, 'object');
        t.end();
    });
});


test('serialize sb2 project with comments as sb3', t => {
    const vm = new VirtualMachine();
    vm.loadProject(readFileToBuffer(commentsSB2ProjectPath))
        .then(() => {
            const result = sb3.serialize(vm.runtime);

            t.type(JSON.stringify(result), 'string');
            t.type(result.targets, 'object');
            t.equal(Array.isArray(result.targets), true);
            t.equal(result.targets.length, 2);

            const stage = result.targets[0];
            t.equal(stage.isStage, true);
            // The stage has 0 blocks, and 1 workspace comment
            t.type(stage.blocks, 'object');
            t.equal(Object.keys(stage.blocks).length, 0);
            t.type(stage.comments, 'object');
            t.equal(Object.keys(stage.comments).length, 1);
            const stageBlockComments = Object.values(stage.comments).filter(comment => !!comment.blockId);
            const stageWorkspaceComments = Object.values(stage.comments).filter(comment => comment.blockId === null);
            t.equal(stageBlockComments.length, 0);
            t.equal(stageWorkspaceComments.length, 1);

            const sprite = result.targets[1];
            t.equal(sprite.isStage, false);
            t.type(sprite.blocks, 'object');
            // Sprite 1 has 6 blocks, 5 block comments, and 1 workspace comment
            t.equal(Object.keys(sprite.blocks).length, 6);
            t.type(sprite.comments, 'object');
            t.equal(Object.keys(sprite.comments).length, 6);

            const spriteBlockComments = Object.values(sprite.comments).filter(comment => !!comment.blockId);
            const spriteWorkspaceComments = Object.values(sprite.comments).filter(comment => comment.blockId === null);
            t.equal(spriteBlockComments.length, 5);
            t.equal(spriteWorkspaceComments.length, 1);

            t.end();
        });
});

test('deserialize sb3 project with comments', t => {
    const vm = new VirtualMachine();
    vm.loadProject(readFileToBuffer(commentsSB3ProjectPath))
        .then(() => {
            const runtime = vm.runtime;

            t.type(runtime.targets, 'object');
            t.equal(Array.isArray(runtime.targets), true);
            t.equal(runtime.targets.length, 2);

            const stage = runtime.targets[0];
            t.equal(stage.isStage, true);
            // The stage has 0 blocks, and 1 workspace comment
            t.type(stage.blocks, 'object');
            t.equal(Object.keys(stage.blocks._blocks).length, 0);
            t.type(stage.comments, 'object');
            t.equal(Object.keys(stage.comments).length, 1);
            const stageBlockComments = Object.values(stage.comments).filter(comment => !!comment.blockId);
            const stageWorkspaceComments = Object.values(stage.comments).filter(comment => comment.blockId === null);
            t.equal(stageBlockComments.length, 0);
            t.equal(stageWorkspaceComments.length, 1);

            const sprite = runtime.targets[1];
            t.equal(sprite.isStage, false);
            t.type(sprite.blocks, 'object');
            // Sprite 1 has 6 blocks, 5 block comments, and 1 workspace comment
            t.equal(Object.values(sprite.blocks._blocks).filter(block => !block.shadow).length, 6);
            t.type(sprite.comments, 'object');
            t.equal(Object.keys(sprite.comments).length, 6);

            const spriteBlockComments = Object.values(sprite.comments).filter(comment => !!comment.blockId);
            const spriteWorkspaceComments = Object.values(sprite.comments).filter(comment => comment.blockId === null);
            t.equal(spriteBlockComments.length, 5);
            t.equal(spriteWorkspaceComments.length, 1);

            t.end();
        });
});

test('deserialize sb3 project with comments - no duplicate id serialization', t => {
    const vm = new VirtualMachine();
    vm.loadProject(readFileToBuffer(commentsSB3NoDupeIds))
        .then(() => {
            const runtime = vm.runtime;

            t.type(runtime.targets, 'object');
            t.equal(Array.isArray(runtime.targets), true);
            t.equal(runtime.targets.length, 2);

            const stage = runtime.targets[0];
            t.equal(stage.isStage, true);
            // The stage has 0 blocks, and 0 workspace comment
            t.type(stage.blocks, 'object');
            t.equal(Object.keys(stage.blocks._blocks).length, 0);
            t.type(stage.comments, 'object');
            t.equal(Object.keys(stage.comments).length, 0);

            const sprite = runtime.targets[1];
            t.equal(sprite.isStage, false);
            t.type(sprite.blocks, 'object');
            // Sprite1 has 1 blocks, 1 block comment, and 1 workspace comment
            t.equal(Object.values(sprite.blocks._blocks).filter(block => !block.shadow).length, 1);
            t.type(sprite.comments, 'object');
            t.equal(Object.keys(sprite.comments).length, 2);

            const spriteBlockComments = Object.values(sprite.comments).filter(comment => !!comment.blockId);
            const spriteWorkspaceComments = Object.values(sprite.comments).filter(comment => comment.blockId === null);
            t.equal(spriteBlockComments.length, 1);
            t.equal(spriteWorkspaceComments.length, 1);

            t.end();
        });
});

test('serializing and deserializing sb3 preserves sprite layer order', t => {
    const vm = new VirtualMachine();
    vm.attachRenderer(new FakeRenderer());
    return vm.loadProject(readFileToBuffer(path.resolve(__dirname, '../fixtures/ordering.sb2')))
        .then(() => {
            // Target get layer order needs a renderer,
            // fake the numbers we would get back from the
            // renderer in order to test that they are serialized
            // correctly
            vm.runtime.targets[0].getLayerOrder = () => 0;
            vm.runtime.targets[1].getLayerOrder = () => 20;
            vm.runtime.targets[2].getLayerOrder = () => 10;
            vm.runtime.targets[3].getLayerOrder = () => 30;

            const result = sb3.serialize(vm.runtime);

            t.type(JSON.stringify(result), 'string');
            t.type(result.targets, 'object');
            t.equal(Array.isArray(result.targets), true);
            t.equal(result.targets.length, 4);

            // First check that the sprites are ordered correctly (as they would
            // appear in the target pane)
            t.equal(result.targets[0].name, 'Stage');
            t.equal(result.targets[1].name, 'First');
            t.equal(result.targets[2].name, 'Second');
            t.equal(result.targets[3].name, 'Third');

            // Check that they are in the correct layer order (as they would render
            // back to front on the stage)
            t.equal(result.targets[0].layerOrder, 0);
            t.equal(result.targets[1].layerOrder, 2);
            t.equal(result.targets[2].layerOrder, 1);
            t.equal(result.targets[3].layerOrder, 3);

            return result;
        })
        .then(serializedObject =>
            sb3.deserialize(
                JSON.parse(JSON.stringify(serializedObject)), new Runtime(), null, false)
                .then(({targets}) => {
                    // First check that the sprites are ordered correctly (as they would
                    // appear in the target pane)
                    t.equal(targets[0].sprite.name, 'Stage');
                    t.equal(targets[1].sprite.name, 'First');
                    t.equal(targets[2].sprite.name, 'Second');
                    t.equal(targets[3].sprite.name, 'Third');

                    // Check that they are in the correct layer order (as they would render
                    // back to front on the stage)
                    t.equal(targets[0].layerOrder, 0);
                    t.equal(targets[1].layerOrder, 2);
                    t.equal(targets[2].layerOrder, 1);
                    t.equal(targets[3].layerOrder, 3);

                    t.end();
                }));
});

test('serializeBlocks', t => {
    const vm = new VirtualMachine();
    vm.loadProject(readFileToBuffer(commentsSB3ProjectPath))
        .then(() => {
            const blocks = vm.runtime.targets[1].blocks._blocks;
            const result = sb3.serializeBlocks(blocks);
            // @todo Analyze
            t.type(result[0], 'object');
            t.ok(Object.keys(result[0]).length < Object.keys(blocks).length, 'less blocks in serialized format');
            t.ok(Array.isArray(result[1]));
            t.end();
        });
});

test('serializeBlocks serializes x and y for topLevel blocks with x,y of 0,0', t => {
    const vm = new VirtualMachine();
    vm.loadProject(readFileToBuffer(topLevelReportersProjectPath))
        .then(() => {
            // Verify that there are 2 blocks and they are both top level
            const blocks = vm.runtime.targets[1].blocks._blocks;
            const blockIds = Object.keys(blocks);
            t.equal(blockIds.length, 2);
            const blocksArray = blockIds.map(key => blocks[key]);
            t.equal(blocksArray.every(b => b.topLevel), true);
            // Simulate cleaning up the blocks by resetting x and y positions to 0
            blockIds.forEach(blockId => {
                blocks[blockId].x = 0;
                blocks[blockId].y = 0;
            });
            const result = sb3.serializeBlocks(blocks);
            const serializedBlocks = result[0];

            t.type(serializedBlocks, 'object');
            const serializedBlockIds = Object.keys(serializedBlocks);
            t.equal(serializedBlockIds.length, 2);
            const firstBlock = serializedBlocks[serializedBlockIds[0]];
            const secondBlock = serializedBlocks[serializedBlockIds[1]];
            t.equal(firstBlock.x, 0);
            t.equal(firstBlock.y, 0);
            t.equal(secondBlock.x, 0);
            t.equal(secondBlock.y, 0);

            t.end();
        });
});

test('serializeBlock does not serialize shadow blocks as top-level', t => {
    const blocks = {
        hatBlock: {
            id: 'hatBlock',
            opcode: 'event_whenflagclicked',
            next: 'costumeBlock',
            parent: null,
            inputs: {},
            fields: {},
            shadow: false,
            topLevel: true,
            x: 0,
            y: 0
        },
        costumeBlock: {
            id: 'costumeBlock',
            opcode: 'looks_switchcostumeto',
            next: null,
            parent: 'hatBlock',
            inputs: {
                COSTUME: {
                    name: 'COSTUME',
                    block: 'varReporter',
                    shadow: 'costumeShadow'
                }
            },
            fields: {},
            shadow: false,
            topLevel: false
        },
        varReporter: {
            id: 'varReporter',
            opcode: 'data_variable',
            next: null,
            parent: 'costumeBlock',
            inputs: {},
            fields: {VARIABLE: {name: 'VARIABLE', value: 'my variable', id: 'var1'}},
            shadow: false,
            topLevel: false
        },
        costumeShadow: {
            id: 'costumeShadow',
            opcode: 'looks_costume',
            next: null,
            parent: null,
            inputs: {},
            fields: {COSTUME: {name: 'COSTUME', value: 'costume1'}},
            shadow: true,
            topLevel: true // bug: should not be serialized as top-level
        }
    };

    const result = sb3.serializeBlocks(blocks);
    const serialized = result[0];

    t.equal(serialized.costumeShadow.topLevel, false,
        'shadow block should not be serialized as top-level');
    t.notOk(serialized.costumeShadow.x,
        'shadow block should not have x coordinate');
    t.notOk(serialized.costumeShadow.y,
        'shadow block should not have y coordinate');
    t.end();
});

test('deserializeBlocks', t => {
    const vm = new VirtualMachine();
    vm.loadProject(readFileToBuffer(commentsSB3ProjectPath))
        .then(() => {
            const blocks = vm.runtime.targets[1].blocks._blocks;
            const serialized = sb3.serializeBlocks(blocks)[0];
            const deserialized = sb3.deserializeBlocks(serialized);
            t.equal(Object.keys(deserialized).length, Object.keys(blocks).length, 'same number of blocks');
            t.end();
        });
});

test('deserializeBlocks on already deserialized input', t => {
    const vm = new VirtualMachine();
    vm.loadProject(readFileToBuffer(commentsSB3ProjectPath))
        .then(() => {
            const blocks = vm.runtime.targets[1].blocks._blocks;
            const serialized = sb3.serializeBlocks(blocks)[0];
            const deserialized = sb3.deserializeBlocks(serialized);
            const deserializedAgain = sb3.deserializeBlocks(deserialized);
            t.same(deserialized, deserializedAgain, 'no change from second pass of deserialize');
            t.end();
        });
});

test('deserializeBlocks clears topLevel on shadow blocks', t => {
    // Production Scratch can serialize obscured shadow blocks as top-level
    // (e.g. when a variable reporter covers a dropdown's shadow). Upstream
    // Blockly throws "Shadow block cannot be a top-level block" if these
    // survive into the XML, so deserialization must clear the flag.
    const blocks = {
        parentBlock: {
            opcode: 'looks_switchcostumeto',
            next: null,
            parent: null,
            inputs: {
                COSTUME: [3, [12, 'my variable', 'var_id'], 'shadowBlock']
            },
            fields: {},
            shadow: false,
            topLevel: true,
            x: 0,
            y: 0
        },
        shadowBlock: {
            opcode: 'looks_costume',
            next: null,
            parent: null,
            inputs: {},
            fields: {COSTUME: ['costume1', null]},
            shadow: true,
            topLevel: true,
            x: 100,
            y: 100
        }
    };

    sb3.deserializeBlocks(blocks);

    t.equal(blocks.shadowBlock.topLevel, false,
        'shadow block should not be top-level after deserialization');
    t.end();
});

test('getExtensionIdForOpcode', t => {
    t.equal(sb3.getExtensionIdForOpcode('wedo_loopy'), 'wedo');

    // does not consider CORE to be extensions
    t.notOk(sb3.getExtensionIdForOpcode('control_loopy'));

    // only considers things before the first underscore
    t.equal(sb3.getExtensionIdForOpcode('hello_there_loopy'), 'hello');

    // does not return anything for opcodes with no extension
    t.notOk(sb3.getExtensionIdForOpcode('hello'));

    // forbidden characters must be replaced with '-'
    t.equal(sb3.getExtensionIdForOpcode('hi:there/happy_people'), 'hi-there-happy');

    t.end();
});

test('(#1608) serializeBlocks maintains top level variable reporters', t => {
    const vm = new VirtualMachine();
    vm.loadProject(readFileToBuffer(variableReporterSB2ProjectPath))
        .then(() => {
            const blocks = vm.runtime.targets[0].blocks._blocks;
            const result = sb3.serialize(vm.runtime);
            // Project should have 1 block, a top-level variable reporter
            t.equal(Object.keys(blocks).length, 1);
            t.equal(Object.keys(result.targets[0].blocks).length, 1);

            // Make sure deserializing these blocks works
            t.doesNotThrow(() => {
                sb3.deserialize(JSON.parse(JSON.stringify(result)), vm.runtime);
            });
            t.end();
        });
});

test('(#1850) sprite draggability state read when loading SB3 file', t => {
    const vm = new VirtualMachine();
    vm.loadProject(readFileToBuffer(draggableSB3ProjectPath))
        .then(() => {
            const sprite1Obj = vm.runtime.targets.find(target => target.sprite.name === 'Sprite1');
            // Sprite1 in project should have draggable set to true
            t.equal(sprite1Obj.draggable, true);
            t.end();
        });
});

test('load origin value from SB3 file json metadata', t => {
    const vm = new VirtualMachine();
    vm.loadProject(readFileToBuffer(originSB3ProjectPath))
        .then(() => {
            t.type(vm.runtime.origin, 'string');
        })
        .then(() => vm.loadProject(readFileToBuffer(originAbsentSB3ProjectPath)))
        .then(() => {
            // After loading a project with an origin, then loading one without an origin,
            // origin value should no longer be set.
            t.equal(vm.runtime.origin, null);
            t.end();
        });
});

test('serialize origin value if it is present', t => {
    const vm = new VirtualMachine();
    vm.loadProject(readFileToBuffer(originSB3ProjectPath))
        .then(() => {
            const result = sb3.serialize(vm.runtime);
            t.type(result.meta.origin, 'string');
            t.end();
        });
});

test('do not serialize origin value if it is not present', t => {
    const vm = new VirtualMachine();
    vm.loadProject(readFileToBuffer(originAbsentSB3ProjectPath))
        .then(() => {
            const result = sb3.serialize(vm.runtime);
            t.equal(result.meta.origin, undefined);
            t.end();
        });
});

// Regression test for forum topic 878291: deserializeBlocks should repair
// broken or missing shadow references by creating a replacement shadow,
// using a peer block's matching shadow as a template when available.
test('deserializeBlocks repairs broken shadow references', t => {
    // Simulate a target with one broken and one intact data_setvariableto.
    // The peer lookup should find the intact block's shadow as a template.
    const blocks = {
        // Broken block: shadow reference points to a nonexistent block
        brokenBlock: {
            opcode: 'data_setvariableto',
            next: null,
            parent: null,
            inputs: {
                VALUE: [3, 'reporterBlock', 'missing_shadow']
            },
            fields: {VARIABLE: ['x', 'varId']},
            shadow: false,
            topLevel: true,
            x: 0,
            y: 0
        },
        reporterBlock: {
            opcode: 'sensing_answer',
            next: null,
            parent: 'brokenBlock',
            inputs: {},
            fields: {},
            shadow: false,
            topLevel: false
        },
        // Intact peer: same opcode, working shadow on VALUE
        peerBlock: {
            opcode: 'data_setvariableto',
            next: null,
            parent: null,
            inputs: {
                VALUE: [1, 'peerShadow']
            },
            fields: {VARIABLE: ['y', 'varId2']},
            shadow: false,
            topLevel: true,
            x: 200,
            y: 0
        },
        peerShadow: {
            opcode: 'text',
            next: null,
            parent: 'peerBlock',
            inputs: {},
            fields: {TEXT: ['hello']},
            shadow: true,
            topLevel: false
        }
    };

    sb3.deserializeBlocks(blocks);

    // The broken shadow should be replaced using the peer's shadow as template
    const repairedId = blocks.brokenBlock.inputs.VALUE.shadow;
    t.not(repairedId, 'missing_shadow', 'broken shadow ID should be replaced');
    t.not(repairedId, null, 'a replacement shadow should be created');
    t.ok(blocks[repairedId], 'replacement shadow block should exist');
    t.equal(blocks[repairedId].opcode, 'text',
        'shadow type should match the peer (text)');
    t.equal(blocks[repairedId].shadow, true,
        'replacement should be marked as shadow');
    t.equal(blocks[repairedId].parent, 'brokenBlock',
        'replacement should reference the broken block as parent');
    t.equal(blocks.brokenBlock.inputs.VALUE.block, 'reporterBlock',
        'connected block reference should be preserved');

    // The peer's shadow should be untouched
    t.equal(blocks.peerBlock.inputs.VALUE.shadow, 'peerShadow',
        'valid shadow reference should be preserved');

    // Test peer lookup across math blocks: broken operator_add should
    // find a math_number shadow from the intact peer.
    const mathBlocks = {
        brokenAdd: {
            opcode: 'operator_add',
            next: null,
            parent: null,
            inputs: {
                NUM1: [3, 'numReporter', 'missing_math_shadow'],
                NUM2: [1, [4, '10']]
            },
            fields: {},
            shadow: false,
            topLevel: true,
            x: 0,
            y: 0
        },
        numReporter: {
            opcode: 'sensing_answer',
            next: null,
            parent: 'brokenAdd',
            inputs: {},
            fields: {},
            shadow: false,
            topLevel: false
        },
        // Intact peer with a math_number shadow on NUM1
        peerAdd: {
            opcode: 'operator_add',
            next: null,
            parent: null,
            inputs: {
                NUM1: [1, 'peerMathShadow'],
                NUM2: [1, [4, '5']]
            },
            fields: {},
            shadow: false,
            topLevel: true,
            x: 200,
            y: 0
        },
        peerMathShadow: {
            opcode: 'math_number',
            next: null,
            parent: 'peerAdd',
            inputs: {},
            fields: {NUM: {name: 'NUM', value: '3'}},
            shadow: true,
            topLevel: false
        }
    };

    sb3.deserializeBlocks(mathBlocks);

    const mathShadowId = mathBlocks.brokenAdd.inputs.NUM1.shadow;
    t.ok(mathBlocks[mathShadowId], 'math shadow should be created');
    t.equal(mathBlocks[mathShadowId].opcode, 'math_number',
        'should use math_number from peer, not text fallback');
    t.equal(mathBlocks[mathShadowId].fields.NUM.name, 'NUM',
        'math_number shadow should have a NUM field');

    // Test fallback to text when no peer exists
    const lonelyBlocks = {
        lonelyBlock: {
            opcode: 'data_setvariableto',
            next: null,
            parent: null,
            inputs: {VALUE: [1, 'orphan_shadow']},
            fields: {VARIABLE: ['z', 'varId3']},
            shadow: false,
            topLevel: true,
            x: 0,
            y: 0
        }
        // No peer block, no shadow block — orphan_shadow is missing
    };

    sb3.deserializeBlocks(lonelyBlocks);

    const fallbackId = lonelyBlocks.lonelyBlock.inputs.VALUE.shadow;
    t.ok(lonelyBlocks[fallbackId], 'fallback shadow should be created');
    t.equal(lonelyBlocks[fallbackId].opcode, 'text',
        'should fall back to text when no peer is available');

    // Test repair of null shadow (INPUT_BLOCK_NO_SHADOW) when peers have shadows.
    // This covers the case where the shadow was lost before save, so
    // the input was serialized as [2, blockId] with no shadow reference.
    const nullShadowBlocks = {
        // Block with null shadow — reporter is connected but shadow is gone
        brokenLt: {
            opcode: 'operator_lt',
            next: null,
            parent: null,
            inputs: {
                OPERAND1: [2, 'ltReporter'] // INPUT_BLOCK_NO_SHADOW
            },
            fields: {},
            shadow: false,
            topLevel: true,
            x: 0,
            y: 0
        },
        ltReporter: {
            opcode: 'data_variable',
            next: null,
            parent: 'brokenLt',
            inputs: {},
            fields: {VARIABLE: ['x', 'varId']},
            shadow: false,
            topLevel: false
        },
        // Intact peer with a shadow on OPERAND1
        peerLt: {
            opcode: 'operator_lt',
            next: null,
            parent: null,
            inputs: {
                OPERAND1: [1, 'peerLtShadow']
            },
            fields: {},
            shadow: false,
            topLevel: true,
            x: 200,
            y: 0
        },
        peerLtShadow: {
            opcode: 'text',
            next: null,
            parent: 'peerLt',
            inputs: {},
            fields: {TEXT: {name: 'TEXT', value: ''}},
            shadow: true,
            topLevel: false
        }
    };

    sb3.deserializeBlocks(nullShadowBlocks);

    const repairedNullShadow = nullShadowBlocks.brokenLt.inputs.OPERAND1.shadow;
    t.ok(repairedNullShadow, 'null shadow should be replaced');
    t.ok(nullShadowBlocks[repairedNullShadow],
        'replacement shadow block should exist');
    t.equal(nullShadowBlocks[repairedNullShadow].opcode, 'text',
        'replacement should match peer shadow type');
    t.equal(nullShadowBlocks.brokenLt.inputs.OPERAND1.block, 'ltReporter',
        'connected block should be preserved');

    t.end();
});
