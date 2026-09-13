const tap = require('tap');
const VirtualMachine = require('../../src/virtual-machine');
const Sprite = require('../../src/sprites/sprite');
const Variable = require('../../src/engine/variable');
const adapter = require('../../src/engine/adapter');
const events = require('../fixtures/events.json');
const Renderer = require('../fixtures/fake-renderer');
const Runtime = require('../../src/engine/runtime');
const RenderedTarget = require('../../src/sprites/rendered-target');

const test = tap.test;

test('deleteSound returns function after deleting or null if nothing was deleted', t => {
    const vm = new VirtualMachine();
    const rt = new Runtime();
    const sprite = new Sprite(null, rt);
    sprite.sounds = [{id: 1}, {id: 2}, {id: 3}];
    const target = new RenderedTarget(sprite, rt);
    vm.editingTarget = target;

    const addFun = vm.deleteSound(1);
    t.equal(sprite.sounds.length, 2);
    t.equal(sprite.sounds[0].id, 1);
    t.equal(sprite.sounds[1].id, 3);
    t.type(addFun, 'function');

    const noAddFun = vm.deleteSound(2);
    t.equal(sprite.sounds.length, 2);
    t.equal(sprite.sounds[0].id, 1);
    t.equal(sprite.sounds[1].id, 3);
    t.equal(noAddFun, null);

    t.end();
});

test('deleteCostume returns function after deleting or null if nothing was deleted', t => {
    const vm = new VirtualMachine();
    const rt = new Runtime();
    const sprite = new Sprite(null, rt);
    sprite.costumes = [{id: 1}, {id: 2}, {id: 3}];
    sprite.currentCostume = 0;
    const target = new RenderedTarget(sprite, rt);
    vm.editingTarget = target;

    const addFun = vm.deleteCostume(1);
    t.equal(sprite.costumes.length, 2);
    t.equal(sprite.costumes[0].id, 1);
    t.equal(sprite.costumes[1].id, 3);
    t.type(addFun, 'function');

    const noAddFun = vm.deleteCostume(2);
    t.equal(sprite.costumes.length, 2);
    t.equal(sprite.costumes[0].id, 1);
    t.equal(sprite.costumes[1].id, 3);
    t.equal(noAddFun, null);

    t.end();
});


test('addSprite throws on invalid string', t => {
    const vm = new VirtualMachine();
    vm.addSprite('this is not a sprite')
        .catch(e => {
            t.equal(e.startsWith('Sprite Upload Error:'), true);
            t.end();
        });
});

test('renameSprite throws when there is no sprite with that id', t => {
    const vm = new VirtualMachine();
    vm.runtime.getTargetById = () => null;
    t.throws(
        (() => vm.renameSprite('id', 'name')),
        new Error('No target with the provided id.')
    );
    t.end();
});

test('renameSprite throws when used on a non-sprite target', t => {
    const vm = new VirtualMachine();
    const fakeTarget = {
        isSprite: () => false
    };
    vm.runtime.getTargetById = () => (fakeTarget);
    t.throws(
        (() => vm.renameSprite('id', 'name')),
        new Error('Cannot rename non-sprite targets.')
    );
    t.end();
});

test('renameSprite throws when there is no sprite for given target', t => {
    const vm = new VirtualMachine();
    const fakeTarget = {
        sprite: null,
        isSprite: () => true
    };
    vm.runtime.getTargetById = () => (fakeTarget);
    t.throws(
        (() => vm.renameSprite('id', 'name')),
        new Error('No sprite associated with this target.')
    );
    t.end();
});

test('renameSprite sets the sprite name', t => {
    const vm = new VirtualMachine();
    const fakeTarget = {
        sprite: {name: 'original'},
        isSprite: () => true
    };
    vm.runtime.getTargetById = () => (fakeTarget);
    vm.renameSprite('id', 'not-original');
    t.equal(fakeTarget.sprite.name, 'not-original');
    t.end();
});

test('renameSprite does not set sprite names to an empty string', t => {
    const vm = new VirtualMachine();
    const fakeTarget = {
        sprite: {name: 'original'},
        isSprite: () => true
    };
    vm.runtime.getTargetById = () => (fakeTarget);
    vm.renameSprite('id', '');
    t.equal(fakeTarget.sprite.name, 'original');
    t.end();
});

test('renameSprite does not set sprite names to reserved names', t => {
    const vm = new VirtualMachine();
    const fakeTarget = {
        sprite: {name: 'original'},
        isSprite: () => true
    };
    vm.runtime.getTargetById = () => (fakeTarget);
    vm.renameSprite('id', '_mouse_');
    t.equal(fakeTarget.sprite.name, 'original');
    t.end();
});

test('renameSprite increments from existing sprite names', t => {
    const vm = new VirtualMachine();
    vm.emitTargetsUpdate = () => {};

    const spr1 = new Sprite(null, vm.runtime);
    const target1 = spr1.createClone();
    const spr2 = new Sprite(null, vm.runtime);
    const target2 = spr2.createClone();

    vm.runtime.targets = [target1, target2];
    vm.renameSprite(target1.id, 'foo');
    t.equal(vm.runtime.targets[0].sprite.name, 'foo');
    vm.renameSprite(target2.id, 'foo');
    t.equal(vm.runtime.targets[1].sprite.name, 'foo2');
    t.end();
});

test('renameSprite does not increment when renaming to the same name', t => {
    const vm = new VirtualMachine();
    vm.emitTargetsUpdate = () => {};

    const spr = new Sprite(null, vm.runtime);
    spr.name = 'foo';
    const target = spr.createClone();

    vm.runtime.targets = [target];

    t.equal(vm.runtime.targets[0].sprite.name, 'foo');
    vm.renameSprite(target.id, 'foo');
    t.equal(vm.runtime.targets[0].sprite.name, 'foo');

    t.end();
});

test('deleteSprite throws when used on a non-sprite target', t => {
    const vm = new VirtualMachine();
    vm.runtime.targets = [{
        id: 'id',
        isSprite: () => false
    }];
    t.throws(
        (() => vm.deleteSprite('id')),
        new Error('Cannot delete non-sprite targets.')
    );
    t.end();
});

test('deleteSprite throws when there is no sprite for the given target', t => {
    const vm = new VirtualMachine();
    vm.runtime.targets = [{
        id: 'id',
        isSprite: () => true,
        sprite: null
    }];
    t.throws(
        (() => vm.deleteSprite('id')),
        new Error('No sprite associated with this target.')
    );
    t.end();
});

test('deleteSprite throws when there is no target with given id', t => {
    const vm = new VirtualMachine();
    vm.runtime.targets = [{
        id: 'id',
        isSprite: () => true,
        sprite: {
            name: 'this name'
        }
    }];
    t.throws(
        (() => vm.deleteSprite('id1')),
        new Error('No target with the provided id.')
    );
    t.end();
});

test('deleteSprite deletes a sprite when given id is associated with a known sprite', t => {
    const vm = new VirtualMachine();
    const spr = new Sprite(null, vm.runtime);
    const currTarget = spr.createClone();

    vm.runtime.targets = [currTarget];

    t.equal(currTarget.sprite.clones.length, 1);
    vm.deleteSprite(currTarget.id);
    t.equal(currTarget.sprite.clones.length, 0);
    t.end();
});

// eslint-disable-next-line @stylistic/max-len
test('deleteSprite sets editing target as null when given sprite is current editing target, and the only target in the runtime', t => {
    const vm = new VirtualMachine();
    const spr = new Sprite(null, vm.runtime);
    const currTarget = spr.createClone();

    vm.editingTarget = currTarget;
    vm.runtime.targets = [currTarget];

    vm.deleteSprite(currTarget.id);

    t.equal(vm.runtime.targets.length, 0);
    t.equal(vm.editingTarget, null);
    t.end();
});

// eslint-disable-next-line @stylistic/max-len
test('deleteSprite updates editingTarget when sprite being deleted is current editing target, and there is another target in the runtime', t => {
    const vm = new VirtualMachine();
    const spr1 = new Sprite(null, vm.runtime);
    const spr2 = new Sprite(null, vm.runtime);
    const currTarget = spr1.createClone();
    const otherTarget = spr2.createClone();

    vm.emitWorkspaceUpdate = () => null;

    vm.runtime.targets = [currTarget, otherTarget];
    vm.editingTarget = currTarget;

    t.equal(vm.runtime.targets.length, 2);
    vm.deleteSprite(currTarget.id);
    t.equal(vm.runtime.targets.length, 1);
    t.equal(vm.editingTarget.id, otherTarget.id);

    // now let's try them in the other order in the runtime.targets list

    // can't reuse deleted targets
    const currTarget2 = spr1.createClone();
    const otherTarget2 = spr2.createClone();

    vm.runtime.targets = [otherTarget2, currTarget2];
    vm.editingTarget = currTarget2;

    t.equal(vm.runtime.targets.length, 2);
    vm.deleteSprite(currTarget2.id);
    t.equal(vm.editingTarget.id, otherTarget2.id);
    t.equal(vm.runtime.targets.length, 1);

    t.end();
});

test('duplicateSprite throws when there is no target with given id', t => {
    const vm = new VirtualMachine();
    vm.runtime.targets = [{
        id: 'id',
        isSprite: () => true,
        sprite: {
            name: 'this name'
        }
    }];
    t.throws(
        (() => vm.duplicateSprite('id1')),
        new Error('No target with the provided id')
    );
    t.end();
});

test('duplicateSprite throws when used on a non-sprite target', t => {
    const vm = new VirtualMachine();
    vm.runtime.targets = [{
        id: 'id',
        isSprite: () => false
    }];
    t.throws(
        (() => vm.duplicateSprite('id')),
        new Error('Cannot duplicate non-sprite targets.')
    );
    t.end();
});

test('duplicateSprite throws when there is no sprite for the given target', t => {
    const vm = new VirtualMachine();
    vm.runtime.targets = [{
        id: 'id',
        isSprite: () => true,
        sprite: null
    }];
    t.throws(
        (() => vm.duplicateSprite('id')),
        new Error('No sprite associated with this target.')
    );
    t.end();
});

test('duplicateSprite duplicates a sprite when given id is associated with known sprite', t => {
    const vm = new VirtualMachine();
    const spr = new Sprite(null, vm.runtime);
    const currTarget = spr.createClone();
    vm.editingTarget = currTarget;

    vm.emitWorkspaceUpdate = () => null;

    vm.runtime.targets = [currTarget];
    t.equal(vm.runtime.targets.length, 1);
    vm.duplicateSprite(currTarget.id).then(() => {
        t.equal(vm.runtime.targets.length, 2);
        t.end();
    });

});

test('duplicateSprite assigns duplicated sprite a fresh name', t => {
    const vm = new VirtualMachine();
    const spr = new Sprite(null, vm.runtime);
    spr.name = 'sprite1';
    const currTarget = spr.createClone();
    vm.editingTarget = currTarget;

    vm.emitWorkspaceUpdate = () => null;

    vm.runtime.targets = [currTarget];
    t.equal(vm.runtime.targets.length, 1);
    vm.duplicateSprite(currTarget.id).then(() => {
        t.equal(vm.runtime.targets.length, 2);
        t.equal(vm.runtime.targets[0].sprite.name, 'sprite1');
        t.equal(vm.runtime.targets[1].sprite.name, 'sprite2');
        t.end();
    });

});

test('reorderCostume', t => {
    const vm = new VirtualMachine();
    vm.emitTargetsUpdate = () => {};

    const spr = new Sprite(null, vm.runtime);
    spr.name = 'foo';
    const target = spr.createClone();

    // Stub out reorder on target, tested in rendered-target tests.
    // Just want to know if it is called with the right params.
    let costumeIndex = null;
    let newIndex = null;
    target.reorderCostume = (_costumeIndex, _newIndex) => {
        costumeIndex = _costumeIndex;
        newIndex = _newIndex;
        return true; // Do not need all the logic about if a reorder occurred.
    };

    vm.runtime.targets = [target];

    t.equal(vm.reorderCostume('not-a-target', 0, 3), false);
    t.equal(costumeIndex, null);
    t.equal(newIndex, null);

    t.equal(vm.reorderCostume(target.id, 0, 3), true);
    t.equal(costumeIndex, 0);
    t.equal(newIndex, 3);

    t.end();
});

test('reorderSound', t => {
    const vm = new VirtualMachine();
    vm.emitTargetsUpdate = () => {};

    const spr = new Sprite(null, vm.runtime);
    spr.name = 'foo';
    const target = spr.createClone();

    // Stub out reorder on target, tested in rendered-target tests.
    // Just want to know if it is called with the right params.
    let soundIndex = null;
    let newIndex = null;
    target.reorderSound = (_soundIndex, _newIndex) => {
        soundIndex = _soundIndex;
        newIndex = _newIndex;
        return true; // Do not need all the logic about if a reorder occurred.
    };

    vm.runtime.targets = [target];

    t.equal(vm.reorderSound('not-a-target', 0, 3), false);
    t.equal(soundIndex, null); // Make sure reorder function was not called somehow.
    t.equal(newIndex, null);

    t.equal(vm.reorderSound(target.id, 0, 3), true);
    t.equal(soundIndex, 0); // Make sure reorder function was called correctly.
    t.equal(newIndex, 3);

    t.end();
});

test('shareCostumeToTarget', t => {
    const vm = new VirtualMachine();
    const spr1 = new Sprite(null, vm.runtime);
    spr1.name = 'foo';
    const target1 = spr1.createClone();
    const costume1 = {name: 'costume1'};
    target1.addCostume(costume1);

    const spr2 = new Sprite(null, vm.runtime);
    spr2.name = 'foo';
    const target2 = spr2.createClone();
    const costume2 = {name: 'another costume'};
    target2.addCostume(costume2);

    vm.runtime.targets = [target1, target2];
    vm.editingTarget = vm.runtime.targets[0];
    vm.emitWorkspaceUpdate = () => null;

    vm.shareCostumeToTarget(0, target2.id).then(() => {
        t.equal(target2.currentCostume, 1);
        t.equal(target2.getCostumes()[1].name, 'costume1');
        t.end();
    });
});

test('shareSoundToTarget', t => {
    const vm = new VirtualMachine();
    const spr1 = new Sprite(null, vm.runtime);
    spr1.name = 'foo';
    const target1 = spr1.createClone();
    const sound1 = {name: 'sound1'};
    target1.addSound(sound1);

    const spr2 = new Sprite(null, vm.runtime);
    spr2.name = 'foo';
    const target2 = spr2.createClone();
    const sound2 = {name: 'another sound'};
    target2.addSound(sound2);

    vm.runtime.targets = [target1, target2];
    vm.editingTarget = vm.runtime.targets[0];
    vm.emitWorkspaceUpdate = () => null;

    vm.shareSoundToTarget(0, target2.id).then(() => {
        t.equal(target2.getSounds()[1].name, 'sound1');
        t.end();
    });
});

test('reorderTarget', t => {
    const vm = new VirtualMachine();
    vm.emitTargetsUpdate = () => {};

    vm.runtime.targets = ['a', 'b', 'c', 'd'];

    t.equal(vm.reorderTarget(2, 2), false);
    t.same(vm.runtime.targets, ['a', 'b', 'c', 'd']);

    // Make sure clamping works
    t.equal(vm.reorderTarget(-100, -5), false);
    t.same(vm.runtime.targets, ['a', 'b', 'c', 'd']);

    // Reorder upwards
    t.equal(vm.reorderTarget(0, 2), true);
    t.same(vm.runtime.targets, ['b', 'c', 'a', 'd']);

    // Reorder downwards
    t.equal(vm.reorderTarget(3, 1), true);
    t.same(vm.runtime.targets, ['b', 'd', 'c', 'a']);

    t.end();
});

test('emitWorkspaceUpdate', t => {
    const vm = new VirtualMachine();
    const blocksToXML = comments => {
        let blockString = 'blocks\n';
        if (comments) {
            for (const commentId in comments) {
                const comment = comments[commentId];
                blockString += `A Block Comment: ${comment.toXML()}`;
            }

        }
        return blockString;
    };
    vm.runtime.targets = [
        {
            isStage: true,
            variables: {
                global: {
                    toXML: () => 'global'
                }
            },
            blocks: {
                toXML: blocksToXML
            },
            comments: {
                aStageComment: {
                    toXML: () => 'aStageComment',
                    blockId: null
                }
            }
        }, {
            variables: {
                unused: {
                    toXML: () => 'unused'
                }
            },
            blocks: {
                toXML: blocksToXML
            },
            comments: {
                someBlockComment: {
                    toXML: () => 'someBlockComment',
                    blockId: 'someBlockId'
                }
            }
        }, {
            variables: {
                local: {
                    toXML: () => 'local'
                }
            },
            blocks: {
                toXML: blocksToXML
            },
            comments: {
                someOtherComment: {
                    toXML: () => 'someOtherComment',
                    blockId: null
                },
                aBlockComment: {
                    toXML: () => 'aBlockComment',
                    blockId: 'a block'
                }
            }
        }
    ];
    vm.editingTarget = vm.runtime.targets[2];

    let xml = null;
    vm.emit = (event, data) => (xml = data.xml);
    vm.emitWorkspaceUpdate();
    t.not(xml.indexOf('global'), -1);
    t.not(xml.indexOf('local'), -1);
    t.equal(xml.indexOf('unused'), -1);
    t.not(xml.indexOf('blocks'), -1);
    t.equal(xml.indexOf('aStageComment'), -1);
    t.equal(xml.indexOf('someBlockComment'), -1);
    t.not(xml.indexOf('someOtherComment'), -1);
    t.not(xml.indexOf('A Block Comment: aBlockComment'), -1);
    t.end();
});

test('drag IO redirect', t => {
    const vm = new VirtualMachine();
    const sprite1Info = [];
    const sprite2Info = [];
    vm.runtime.targets = [
        {
            id: 'sprite1',
            postSpriteInfo: data => sprite1Info.push(data)
        }, {
            id: 'sprite2',
            postSpriteInfo: data => sprite2Info.push(data),
            startDrag: () => {},
            stopDrag: () => {}
        }
    ];
    vm.editingTarget = vm.runtime.targets[0];
    // Stub emitWorkspace/TargetsUpdate, it needs data we don't care about here
    vm.emitWorkspaceUpdate = () => null;
    vm.emitTargetsUpdate = () => null;

    // postSpriteInfo should go to the editing target by default``
    vm.postSpriteInfo('sprite1 info');
    t.equal(sprite1Info[0], 'sprite1 info');

    // postSprite info goes to the drag target if it exists
    vm.startDrag('sprite2');
    vm.postSpriteInfo('sprite2 info');
    t.equal(sprite2Info[0], 'sprite2 info');

    // stop drag should set the editing target
    vm.stopDrag('sprite2');
    t.equal(vm.editingTarget.id, 'sprite2');

    // Then postSpriteInfo should continue posting to the new editing target
    vm.postSpriteInfo('sprite2 info 2');
    t.equal(sprite2Info[1], 'sprite2 info 2');
    t.end();
});

test('select original after dragging clone', t => {
    const vm = new VirtualMachine();
    let newEditingTargetId = null;
    vm.setEditingTarget = id => {
        newEditingTargetId = id;
    };
    vm.runtime.targets = [
        {
            id: 'sprite1_clone',
            sprite: {clones: [{id: 'sprite1_original'}]},
            stopDrag: () => {}
        }, {
            id: 'sprite2',
            stopDrag: () => {}
        }
    ];

    // Stop drag on a bare target selects that target
    vm.stopDrag('sprite2');
    t.equal(newEditingTargetId, 'sprite2');

    // Stop drag on target with parent sprite selects the 0th clone of that sprite
    vm.stopDrag('sprite1_clone');
    t.equal(newEditingTargetId, 'sprite1_original');
    t.end();
});

test('setVariableValue', t => {
    const vm = new VirtualMachine();
    const spr = new Sprite(null, vm.runtime);
    const target = spr.createClone();
    target.createVariable('a-variable', 'a-name', Variable.SCALAR_TYPE);

    vm.runtime.targets = [target];

    // Returns false if there is no variable to set
    t.equal(vm.setVariableValue(target.id, 'not-a-variable', 100), false);

    // Returns false if there is no target with that id
    t.equal(vm.setVariableValue('not-a-target', 'a-variable', 100), false);

    // Returns true and updates the value if variable is present
    t.equal(vm.setVariableValue(target.id, 'a-variable', 100), true);
    t.equal(target.lookupVariableById('a-variable').value, 100);

    t.end();
});

test('setVariableValue requests update for cloud variable', t => {
    const vm = new VirtualMachine();
    const spr = new Sprite(null, vm.runtime);
    const target = spr.createClone();
    target.isStage = true;
    target.createVariable('a-variable', 'a-name', Variable.SCALAR_TYPE, true /* isCloud */);

    vm.runtime.targets = [target];

    // Mock cloud io device requestUpdateVariable function
    let requestUpdateVarWasCalled = false;
    let varName;
    let varValue;
    vm.runtime.ioDevices.cloud.requestUpdateVariable = (name, value) => {
        requestUpdateVarWasCalled = true;
        varName = name;
        varValue = value;
    };

    vm.setVariableValue(target.id, 'not-a-variable', 100);
    t.equal(requestUpdateVarWasCalled, false);

    vm.setVariableValue(target.id, 'a-variable', 100);
    t.equal(requestUpdateVarWasCalled, true);
    t.equal(varName, 'a-name');
    t.equal(varValue, 100);

    t.end();
});

test('getVariableValue', t => {
    const vm = new VirtualMachine();
    const spr = new Sprite(null, vm.runtime);
    const target = spr.createClone();
    target.createVariable('a-variable', 'a-name', Variable.SCALAR_TYPE);

    vm.runtime.targets = [target];

    // Returns null if there is no variable with that id
    t.equal(vm.getVariableValue(target.id, 'not-a-variable'), null);

    // Returns null if there is no target with that id
    t.equal(vm.getVariableValue('not-a-target', 'a-variable'), null);

    // Returns true and updates the value if variable is present
    t.equal(vm.getVariableValue(target.id, 'a-variable'), 0);
    vm.setVariableValue(target.id, 'a-variable', 'string');
    t.equal(vm.getVariableValue(target.id, 'a-variable'), 'string');

    t.end();
});

// Block Listener tests for comment
test('comment_create event updates comment with null position', t => {
    const vm = new VirtualMachine();
    const spr = new Sprite(null, vm.runtime);
    const target = spr.createClone();

    target.createComment('a comment', null, 'some text',
        null, null, 200, 300, false);
    vm.runtime.targets = [target];
    vm.editingTarget = target;
    vm.runtime.setEditingTarget(target);

    const comment = target.comments['a comment'];
    t.equal(comment.x, null);
    t.equal(comment.y, null);

    vm.blockListener(events.createcommentUpdatePosition);

    t.equal(comment.x, 10);
    t.equal(comment.y, 20);

    t.end();
});

test('shareBlocksToTarget shares global variables without any name changes', t => {
    const vm = new VirtualMachine();
    const runtime = vm.runtime;
    const spr1 = new Sprite(null, runtime);
    const stage = spr1.createClone();
    stage.isStage = true;

    const spr2 = new Sprite(null, runtime);
    const target = spr2.createClone();

    runtime.targets = [stage, target];
    vm.editingTarget = target;
    vm.runtime.setEditingTarget(target);

    stage.createVariable('mock var id', 'a mock variable', Variable.SCALAR_TYPE);
    t.equal(Object.keys(target.variables).length, 0);
    t.equal(Object.keys(stage.variables).length, 1);
    t.equal(stage.variables['mock var id'].name, 'a mock variable');


    vm.setVariableValue(stage.id, 'mock var id', 10);
    t.equal(vm.getVariableValue(stage.id, 'mock var id'), 10);

    target.blocks.createBlock(adapter(events.mockVariableBlock)[0]);

    // Verify the block exists on the target, and that it references the global variable
    t.type(target.blocks.getBlock('a block'), 'object');
    t.type(target.blocks.getBlock('a block').fields, 'object');
    t.type(target.blocks.getBlock('a block').fields.VARIABLE, 'object');
    t.equal(target.blocks.getBlock('a block').fields.VARIABLE.id, 'mock var id');

    // Verify that the block does not exist on the stage
    t.type(stage.blocks.getBlock('a block'), 'undefined');

    // Share the block to the stage
    vm.shareBlocksToTarget([target.blocks.getBlock('a block')], stage.id, target.id).then(() => {

        // Verify that the block now exists on the target as well as the stage
        t.type(target.blocks.getBlock('a block'), 'object');
        t.type(target.blocks.getBlock('a block').fields, 'object');
        t.type(target.blocks.getBlock('a block').fields.VARIABLE, 'object');
        t.equal(target.blocks.getBlock('a block').fields.VARIABLE.id, 'mock var id');

        const newBlockId = Object.keys(stage.blocks._blocks)[0];
        t.type(stage.blocks.getBlock(newBlockId), 'object');
        t.type(stage.blocks.getBlock(newBlockId).fields, 'object');
        t.type(stage.blocks.getBlock(newBlockId).fields.VARIABLE, 'object');
        t.equal(stage.blocks.getBlock(newBlockId).fields.VARIABLE.id, 'mock var id');

        // Verify the shared block id is different
        t.not(newBlockId, 'a block');

        // Verify that the variables haven't changed, the variable still exists on the
        // stage, it should still have the same name and value, and there should be
        // no variables on the target.
        t.equal(Object.keys(target.variables).length, 0);
        t.equal(Object.keys(stage.variables).length, 1);
        t.equal(stage.variables['mock var id'].name, 'a mock variable');
        t.equal(vm.getVariableValue(stage.id, 'mock var id'), 10);

        t.end();
    });
});

test('shareBlocksToTarget shares a local variable to the stage, creating a global variable with a new name', t => {
    const vm = new VirtualMachine();
    const runtime = vm.runtime;
    const spr1 = new Sprite(null, runtime);
    const stage = spr1.createClone();
    stage.isStage = true;

    const spr2 = new Sprite(null, runtime);
    const target = spr2.createClone();

    runtime.targets = [stage, target];
    vm.editingTarget = target;
    vm.runtime.setEditingTarget(target);

    target.createVariable('mock var id', 'a mock variable', Variable.SCALAR_TYPE);
    t.equal(Object.keys(stage.variables).length, 0);
    t.equal(Object.keys(target.variables).length, 1);
    t.equal(target.variables['mock var id'].name, 'a mock variable');


    vm.setVariableValue(target.id, 'mock var id', 10);
    t.equal(vm.getVariableValue(target.id, 'mock var id'), 10);

    target.blocks.createBlock(adapter(events.mockVariableBlock)[0]);

    // Verify the block exists on the target, and that it references the global variable
    t.type(target.blocks.getBlock('a block'), 'object');
    t.type(target.blocks.getBlock('a block').fields, 'object');
    t.type(target.blocks.getBlock('a block').fields.VARIABLE, 'object');
    t.equal(target.blocks.getBlock('a block').fields.VARIABLE.id, 'mock var id');

    // Verify that the block does not exist on the stage
    t.type(stage.blocks.getBlock('a block'), 'undefined');

    // Share the block to the stage
    vm.shareBlocksToTarget([target.blocks.getBlock('a block')], stage.id, target.id).then(() => {
        // Verify that the block still exists on the target and remains unchanged
        t.type(target.blocks.getBlock('a block'), 'object');
        t.type(target.blocks.getBlock('a block').fields, 'object');
        t.type(target.blocks.getBlock('a block').fields.VARIABLE, 'object');
        t.equal(target.blocks.getBlock('a block').fields.VARIABLE.id, 'mock var id');

        const newBlockId = Object.keys(stage.blocks._blocks)[0];
        t.type(stage.blocks.getBlock(newBlockId), 'object');
        t.type(stage.blocks.getBlock(newBlockId).fields, 'object');
        t.type(stage.blocks.getBlock(newBlockId).fields.VARIABLE, 'object');
        t.equal(stage.blocks.getBlock(newBlockId).fields.VARIABLE.id, 'StageVarFromLocal_mock var id');

        // Verify that a new global variable was created, the old one still exists on
        // the target and still has the same name and value, and the new one has
        // a new name and value 0.
        t.equal(Object.keys(target.variables).length, 1);
        t.equal(target.variables['mock var id'].name, 'a mock variable');
        t.equal(vm.getVariableValue(target.id, 'mock var id'), 10);

        // Verify that a new variable was created on the stage, with a new name and new id
        t.equal(Object.keys(stage.variables).length, 1);
        t.type(stage.variables['mock var id'], 'undefined');
        const newGlobalVar = Object.values(stage.variables)[0];
        t.equal(newGlobalVar.name, 'Stage: a mock variable');
        const newId = newGlobalVar.id;
        t.not(newId, 'mock var id');
        t.equal(vm.getVariableValue(stage.id, newId), 0);

        t.end();
    });
});

test('shareBlocksToTarget chooses a fresh name for a new global variable checking for conflicts on all sprites', t => {
    const vm = new VirtualMachine();
    const runtime = vm.runtime;
    const spr1 = new Sprite(null, runtime);
    const stage = spr1.createClone();
    stage.isStage = true;

    const spr2 = new Sprite(null, runtime);
    const target = spr2.createClone();

    const spr3 = new Sprite(null, runtime);
    const otherTarget = spr3.createClone();

    runtime.targets = [stage, target, otherTarget];
    vm.editingTarget = target;
    vm.runtime.setEditingTarget(target);

    target.createVariable('mock var id', 'a mock variable', Variable.SCALAR_TYPE);
    t.equal(Object.keys(stage.variables).length, 0);
    t.equal(Object.keys(target.variables).length, 1);
    t.equal(target.variables['mock var id'].name, 'a mock variable');


    vm.setVariableValue(target.id, 'mock var id', 10);
    t.equal(vm.getVariableValue(target.id, 'mock var id'), 10);

    target.blocks.createBlock(adapter(events.mockVariableBlock)[0]);

    // Verify the block exists on the target, and that it references the global variable
    t.type(target.blocks.getBlock('a block'), 'object');
    t.type(target.blocks.getBlock('a block').fields, 'object');
    t.type(target.blocks.getBlock('a block').fields.VARIABLE, 'object');
    t.equal(target.blocks.getBlock('a block').fields.VARIABLE.id, 'mock var id');

    // Verify that the block does not exist on the stage
    t.type(stage.blocks.getBlock('a block'), 'undefined');

    // Create a variable that conflicts with what will be the new name for the
    // new global variable to ensure a fresh name is chosen
    otherTarget.createVariable('a different var', 'Stage: a mock variable', Variable.SCALAR_TYPE);

    // Share the block to the stage
    vm.shareBlocksToTarget([target.blocks.getBlock('a block')], stage.id, target.id).then(() => {
        // Verify that the block still exists on the target and remains unchanged
        t.type(target.blocks.getBlock('a block'), 'object');
        t.type(target.blocks.getBlock('a block').fields, 'object');
        t.type(target.blocks.getBlock('a block').fields.VARIABLE, 'object');
        t.equal(target.blocks.getBlock('a block').fields.VARIABLE.id, 'mock var id');

        const newBlockId = Object.keys(stage.blocks._blocks)[0];
        t.type(stage.blocks.getBlock(newBlockId), 'object');
        t.type(stage.blocks.getBlock(newBlockId).fields, 'object');
        t.type(stage.blocks.getBlock(newBlockId).fields.VARIABLE, 'object');
        t.equal(stage.blocks.getBlock(newBlockId).fields.VARIABLE.id, 'StageVarFromLocal_mock var id');

        // Verify that a new global variable was created, the old one still exists on
        // the target and still has the same name and value, and the new one has
        // a new name and value 0.
        t.equal(Object.keys(target.variables).length, 1);
        t.equal(target.variables['mock var id'].name, 'a mock variable');
        t.equal(vm.getVariableValue(target.id, 'mock var id'), 10);

        // Verify that a new variable was created on the stage, with a new name and new id
        t.equal(Object.keys(stage.variables).length, 1);
        t.type(stage.variables['mock var id'], 'undefined');
        const newGlobalVar = Object.values(stage.variables)[0];
        t.equal(newGlobalVar.name, 'Stage: a mock variable2');
        const newId = newGlobalVar.id;
        t.not(newId, 'mock var id');
        t.equal(vm.getVariableValue(stage.id, newId), 0);

        t.end();
    });
});

test('shareBlocksToTarget without a source target creates a missing variable on the stage', t => {
    const vm = new VirtualMachine();
    const runtime = vm.runtime;
    const spr1 = new Sprite(null, runtime);
    const stage = spr1.createClone();
    stage.isStage = true;

    const spr2 = new Sprite(null, runtime);
    const target = spr2.createClone();

    runtime.targets = [stage, target];
    vm.editingTarget = target;
    vm.runtime.setEditingTarget(target);

    const blocksToShare = adapter(events.mockVariableBlock);

    t.equal(Object.keys(stage.variables).length, 0);
    t.equal(Object.keys(target.variables).length, 0);

    vm.shareBlocksToTarget(blocksToShare, target.id).then(() => {
        t.equal(Object.keys(stage.variables).length, 1, 'variable created on stage');
        const newVar = stage.variables['mock var id'];
        t.ok(newVar, 'variable preserves the original id');
        t.equal(newVar.name, 'a mock variable');
        t.equal(newVar.type, Variable.SCALAR_TYPE);
        t.equal(Object.keys(target.variables).length, 0, 'no variable on the receiving sprite');

        const newBlockId = Object.keys(target.blocks._blocks)[0];
        t.equal(target.blocks.getBlock(newBlockId).fields.VARIABLE.id, 'mock var id');

        t.end();
    });
});

test('shareBlocksToTarget without a source target creates a missing broadcast on the stage', t => {
    const vm = new VirtualMachine();
    const runtime = vm.runtime;
    const spr1 = new Sprite(null, runtime);
    const stage = spr1.createClone();
    stage.isStage = true;

    const spr2 = new Sprite(null, runtime);
    const target = spr2.createClone();

    runtime.targets = [stage, target];
    vm.editingTarget = target;
    vm.runtime.setEditingTarget(target);

    const blocksToShare = adapter(events.mockBroadcastBlock);

    t.equal(Object.keys(stage.variables).length, 0);

    vm.shareBlocksToTarget(blocksToShare, target.id).then(() => {
        t.equal(Object.keys(stage.variables).length, 1, 'broadcast created on stage');
        const newBroadcast = stage.variables['mock broadcast message id'];
        t.ok(newBroadcast, 'broadcast preserves the original id');
        t.equal(newBroadcast.name, 'my message');
        t.equal(newBroadcast.type, Variable.BROADCAST_MESSAGE_TYPE);

        const menuBlockId = Object.keys(target.blocks._blocks)
            .find(id => target.blocks.getBlock(id).opcode === 'event_broadcast_menu');
        t.ok(menuBlockId, 'broadcast menu block exists on the target');
        t.equal(target.blocks.getBlock(menuBlockId).fields.BROADCAST_OPTION.id, 'mock broadcast message id');

        t.end();
    });
});

test('shareBlocksToTarget without a source target remaps a variable to an existing same-name global', t => {
    const vm = new VirtualMachine();
    const runtime = vm.runtime;
    const spr1 = new Sprite(null, runtime);
    const stage = spr1.createClone();
    stage.isStage = true;

    const spr2 = new Sprite(null, runtime);
    const target = spr2.createClone();

    runtime.targets = [stage, target];
    vm.editingTarget = target;
    vm.runtime.setEditingTarget(target);

    stage.createVariable('pre-existing global var id', 'a mock variable', Variable.SCALAR_TYPE);

    const blocksToShare = adapter(events.mockVariableBlock);

    vm.shareBlocksToTarget(blocksToShare, target.id).then(() => {
        t.equal(Object.keys(stage.variables).length, 1, 'no duplicate variable created');
        t.ok(stage.variables['pre-existing global var id'], 'existing variable preserved');

        const newBlockId = Object.keys(target.blocks._blocks)[0];
        t.equal(target.blocks.getBlock(newBlockId).fields.VARIABLE.id, 'pre-existing global var id',
            'block field id remapped to existing variable');

        t.end();
    });
});

test('shareBlocksToTarget without a source target creates broadcasts when pasted onto the stage', t => {
    const vm = new VirtualMachine();
    const runtime = vm.runtime;
    const spr1 = new Sprite(null, runtime);
    const stage = spr1.createClone();
    stage.isStage = true;

    runtime.targets = [stage];
    vm.editingTarget = stage;
    vm.runtime.setEditingTarget(stage);

    const blocksToShare = adapter(events.mockBroadcastBlock);

    vm.shareBlocksToTarget(blocksToShare, stage.id).then(() => {
        t.equal(Object.keys(stage.variables).length, 1, 'broadcast created on stage when stage is the target');
        const newBroadcast = stage.variables['mock broadcast message id'];
        t.ok(newBroadcast);
        t.equal(newBroadcast.name, 'my message');
        t.equal(newBroadcast.type, Variable.BROADCAST_MESSAGE_TYPE);

        t.end();
    });
});

test('shareBlocksToTarget loads extensions that have not yet been loaded', t => {
    const vm = new VirtualMachine();
    const runtime = vm.runtime;
    const spr1 = new Sprite(null, runtime);
    const stage = spr1.createClone();
    runtime.targets = [stage];

    const fakeBlocks = [
        {opcode: 'loaded_fakeblock'},
        {opcode: 'notloaded_fakeblock'}
    ];

    // Stub the extension manager
    const loadedIds = [];
    vm.extensionManager = {
        isExtensionLoaded: id => id === 'loaded',
        loadExtensionURL: id => new Promise(resolve => {
            loadedIds.push(id);
            resolve();
        })
    };

    vm.shareBlocksToTarget(fakeBlocks, stage.id).then(() => {
        // Verify that only the not-loaded extension gets loaded
        t.same(loadedIds, ['notloaded']);
        t.end();
    });
});

test('installTargets creates a stage broadcast for a sprite import that references one', t => {
    const vm = new VirtualMachine();
    const runtime = vm.runtime;

    const spr1 = new Sprite(null, runtime);
    const stage = spr1.createClone();
    stage.isStage = true;
    runtime.targets = [stage];

    const importedSprite = new Sprite(null, runtime);
    const importedTarget = importedSprite.createClone();
    importedTarget.isStage = false;
    importedTarget.getName = () => 'Imported';
    adapter(events.mockBroadcastBlock).forEach(block => importedTarget.blocks.createBlock(block));

    t.equal(Object.keys(stage.variables).length, 0);

    const extensions = {extensionIDs: new Set(), extensionURLs: new Map()};
    vm.installTargets([importedTarget], extensions, false).then(() => {
        t.equal(Object.keys(stage.variables).length, 1, 'broadcast created on stage during sprite import');
        const newBroadcast = stage.variables['mock broadcast message id'];
        t.ok(newBroadcast);
        t.equal(newBroadcast.name, 'my message');
        t.equal(newBroadcast.type, Variable.BROADCAST_MESSAGE_TYPE);

        t.end();
    });
});

test('installTargets repairs dangling variable references on whole-project load', t => {
    const vm = new VirtualMachine();
    const runtime = vm.runtime;

    const stageSprite = new Sprite(null, runtime);
    const stage = stageSprite.createClone();
    stage.isStage = true;
    stage.getName = () => 'Stage';

    const spriteSprite = new Sprite(null, runtime);
    const sprite = spriteSprite.createClone();
    sprite.isStage = false;
    sprite.getName = () => 'Sprite';
    // Block with a variable field referencing an id that's not defined anywhere — the
    // shape produced when a project saved during the missing-definitions bug is loaded.
    sprite.blocks.createBlock(adapter(events.mockVariableBlock)[0]);
    adapter(events.mockBroadcastBlock).forEach(block => sprite.blocks.createBlock(block));

    t.equal(Object.keys(stage.variables).length, 0);
    t.equal(Object.keys(sprite.variables).length, 0);

    const extensions = {extensionIDs: new Set(), extensionURLs: new Map()};
    vm.installTargets([stage, sprite], extensions, true).then(() => {
        // Match the runtime's lookupOrCreateVariable: an undefined variable is created on
        // the sprite that references it, while broadcasts always live on the stage.
        t.equal(Object.keys(stage.variables).length, 1, 'broadcast created on stage');
        t.ok(stage.variables['mock broadcast message id'], 'dangling broadcast reference reconciled');
        t.equal(Object.keys(sprite.variables).length, 1, 'variable created on the sprite');
        t.ok(sprite.variables['mock var id'], 'dangling variable reference reconciled');
        t.equal(sprite.variables['mock var id'].name, 'a mock variable');

        t.end();
    });
});

test('installTargets resolves a dangling reference to the sprite\'s own same-name local on whole-project load', t => {
    // Regression for scratchfoundation/scratch-editor#601: two sprites each own a local
    // "i", the stage owns a global "total", and one sprite's "for each" block carries a
    // stale id with the name "i". Loading must resolve that field to the sprite's own "i"
    // and leave every other variable, on every target, untouched.
    const vm = new VirtualMachine();
    const runtime = vm.runtime;

    const stageSprite = new Sprite(null, runtime);
    const stage = stageSprite.createClone();
    stage.isStage = true;
    stage.getName = () => 'Stage';
    stage.createVariable('global total id', 'total', Variable.SCALAR_TYPE);

    const makeSprite = name => {
        const sprite = new Sprite(null, runtime);
        const target = sprite.createClone();
        target.isStage = false;
        target.getName = () => name;
        return target;
    };
    const makeVariableBlock = (blockId, opcode, fieldId, fieldValue) => ({
        id: blockId,
        opcode,
        inputs: {},
        fields: {
            VARIABLE: {
                name: 'VARIABLE',
                id: fieldId,
                value: fieldValue,
                variableType: Variable.SCALAR_TYPE
            }
        },
        next: null,
        topLevel: true,
        parent: null,
        shadow: false,
        x: 0,
        y: 0
    });

    const setup = makeSprite('Setup');
    setup.createVariable('setup i id', 'i', Variable.SCALAR_TYPE);
    setup.blocks.createBlock(makeVariableBlock('setup loop', 'control_for_each', 'setup i id', 'i'));

    const bsp = makeSprite('BSP');
    bsp.createVariable('bsp i id', 'i', Variable.SCALAR_TYPE);
    bsp.blocks.createBlock(makeVariableBlock('bsp loop', 'control_for_each', 'stale i id', 'i'));
    bsp.blocks.createBlock(makeVariableBlock('bsp body', 'data_variable', 'bsp i id', 'i'));

    const extensions = {extensionIDs: new Set(), extensionURLs: new Map()};
    vm.installTargets([stage, setup, bsp], extensions, true).then(() => {
        t.same(Object.keys(stage.variables), ['global total id'], 'no global created');
        t.equal(stage.variables['global total id'].name, 'total', 'global not renamed');
        t.same(Object.keys(setup.variables), ['setup i id'], 'other sprite untouched');
        t.equal(setup.variables['setup i id'].name, 'i', 'other sprite local not renamed');
        t.equal(setup.blocks.getBlock('setup loop').fields.VARIABLE.id, 'setup i id');
        t.same(Object.keys(bsp.variables), ['bsp i id'], 'no new local on the affected sprite');
        t.equal(bsp.variables['bsp i id'].name, 'i', 'affected sprite local not renamed');

        const loopField = bsp.blocks.getBlock('bsp loop').fields.VARIABLE;
        const bodyField = bsp.blocks.getBlock('bsp body').fields.VARIABLE;
        t.equal(loopField.id, 'bsp i id', 'stale loop reference resolved to the sprite\'s own local');
        t.equal(loopField.value, 'i');
        t.equal(bodyField.id, 'bsp i id');
        t.equal(bodyField.value, 'i');

        t.end();
    });
});

// Helpers for the shared-missing-definition tests below.
const makeSpriteTarget = (runtime, name) => {
    const sprite = new Sprite(null, runtime);
    const target = sprite.createClone();
    target.isStage = false;
    target.getName = () => name;
    return target;
};
const makeStageTarget = runtime => {
    const sprite = new Sprite(null, runtime);
    const stage = sprite.createClone();
    stage.isStage = true;
    stage.getName = () => 'Stage';
    return stage;
};
const makeDanglingVariableBlock = (blockId, fieldId, fieldValue) => ({
    id: blockId,
    opcode: 'data_variable',
    inputs: {},
    fields: {
        VARIABLE: {
            name: 'VARIABLE',
            id: fieldId,
            value: fieldValue,
            variableType: Variable.SCALAR_TYPE
        }
    },
    next: null,
    topLevel: true,
    parent: null,
    shadow: false,
    x: 0,
    y: 0
});

test('installTargets restores a missing global shared by several sprites on whole-project load', t => {
    // The definition-dropping bug left a global's references intact on every sprite
    // that used it. They shared one variable, so restore one global rather than
    // giving each sprite a private local.
    const vm = new VirtualMachine();
    const runtime = vm.runtime;
    const stage = makeStageTarget(runtime);
    const spriteA = makeSpriteTarget(runtime, 'A');
    const spriteB = makeSpriteTarget(runtime, 'B');
    spriteA.blocks.createBlock(makeDanglingVariableBlock('block A', 'lost global id', 'score'));
    spriteB.blocks.createBlock(makeDanglingVariableBlock('block B', 'lost global id', 'score'));

    const extensions = {extensionIDs: new Set(), extensionURLs: new Map()};
    vm.installTargets([stage, spriteA, spriteB], extensions, true).then(() => {
        t.same(Object.keys(stage.variables), ['lost global id'], 'one global restored under the shared id');
        t.equal(stage.variables['lost global id'].name, 'score');
        t.equal(Object.keys(spriteA.variables).length, 0, 'no local on A');
        t.equal(Object.keys(spriteB.variables).length, 0, 'no local on B');
        t.equal(spriteA.blocks.getBlock('block A').fields.VARIABLE.id, 'lost global id');
        t.equal(spriteB.blocks.getBlock('block B').fields.VARIABLE.id, 'lost global id');
        t.end();
    });
});

test('installTargets leaves a shared missing id to per-sprite repair when a sprite owns a same-name local', t => {
    // A same-name local on one referencing sprite is the #601 shape: that sprite
    // would have resolved by name to its own local, so no global is restored. The
    // other sprite falls back to creating its own local, as the runtime would have.
    const vm = new VirtualMachine();
    const runtime = vm.runtime;
    const stage = makeStageTarget(runtime);
    const spriteA = makeSpriteTarget(runtime, 'A');
    const spriteB = makeSpriteTarget(runtime, 'B');
    spriteA.createVariable('a score id', 'score', Variable.SCALAR_TYPE);
    spriteA.blocks.createBlock(makeDanglingVariableBlock('block A', 'stale id', 'score'));
    spriteB.blocks.createBlock(makeDanglingVariableBlock('block B', 'stale id', 'score'));

    const extensions = {extensionIDs: new Set(), extensionURLs: new Map()};
    vm.installTargets([stage, spriteA, spriteB], extensions, true).then(() => {
        t.equal(Object.keys(stage.variables).length, 0, 'no global restored');
        t.same(Object.keys(spriteA.variables), ['a score id'], 'A keeps only its own local');
        t.equal(spriteA.blocks.getBlock('block A').fields.VARIABLE.id, 'a score id', 'A resolved to its local');
        t.same(Object.keys(spriteB.variables), ['stale id'], 'B created its own local');
        t.equal(spriteB.variables['stale id'].name, 'score');
        t.end();
    });
});

test('installTargets remaps a shared missing id to an existing same-name global', t => {
    const vm = new VirtualMachine();
    const runtime = vm.runtime;
    const stage = makeStageTarget(runtime);
    stage.createVariable('existing score id', 'score', Variable.SCALAR_TYPE);
    const spriteA = makeSpriteTarget(runtime, 'A');
    const spriteB = makeSpriteTarget(runtime, 'B');
    spriteA.blocks.createBlock(makeDanglingVariableBlock('block A', 'lost global id', 'score'));
    spriteB.blocks.createBlock(makeDanglingVariableBlock('block B', 'lost global id', 'score'));

    const extensions = {extensionIDs: new Set(), extensionURLs: new Map()};
    vm.installTargets([stage, spriteA, spriteB], extensions, true).then(() => {
        t.same(Object.keys(stage.variables), ['existing score id'], 'no second global');
        t.equal(spriteA.blocks.getBlock('block A').fields.VARIABLE.id, 'existing score id');
        t.equal(spriteB.blocks.getBlock('block B').fields.VARIABLE.id, 'existing score id');
        t.equal(Object.keys(spriteA.variables).length + Object.keys(spriteB.variables).length, 0, 'no locals');
        t.end();
    });
});

test('installTargets restores a missing global shared by the stage and a sprite', t => {
    const vm = new VirtualMachine();
    const runtime = vm.runtime;
    const stage = makeStageTarget(runtime);
    const sprite = makeSpriteTarget(runtime, 'A');
    stage.blocks.createBlock(makeDanglingVariableBlock('stage block', 'lost global id', 'score'));
    sprite.blocks.createBlock(makeDanglingVariableBlock('sprite block', 'lost global id', 'score'));

    const extensions = {extensionIDs: new Set(), extensionURLs: new Map()};
    vm.installTargets([stage, sprite], extensions, true).then(() => {
        t.same(Object.keys(stage.variables), ['lost global id'], 'global restored');
        t.equal(Object.keys(sprite.variables).length, 0, 'no local on the sprite');
        t.equal(sprite.blocks.getBlock('sprite block').fields.VARIABLE.id, 'lost global id');
        t.end();
    });
});

test('installTargets on sprite import does not run the shared-definition restore', t => {
    // Import reconciles only the imported sprite; there is nothing to share with.
    // Its leftover reference still becomes a global via fixUpVariableReferences.
    const vm = new VirtualMachine();
    const runtime = vm.runtime;
    const stage = makeStageTarget(runtime);
    runtime.targets = [stage];
    const imported = makeSpriteTarget(runtime, 'Imported');
    imported.blocks.createBlock(makeDanglingVariableBlock('a block', 'lost global id', 'score'));

    const extensions = {extensionIDs: new Set(), extensionURLs: new Map()};
    vm.installTargets([imported], extensions, false).then(() => {
        t.same(Object.keys(stage.variables), ['lost global id'], 'global created by the import path');
        t.equal(Object.keys(imported.variables).length, 0, 'no local on the imported sprite');
        t.end();
    });
});

test('installTargets does not restore a shared id that another sprite defines locally', t => {
    // Sprite A owns the id as a local; B and C carry stale references to it from a
    // script copied out of A long ago. That is not a lost global. The runtime gave
    // B and C their own locals on execution, so the per-sprite repair does the same.
    const vm = new VirtualMachine();
    const runtime = vm.runtime;
    const stage = makeStageTarget(runtime);
    const spriteA = makeSpriteTarget(runtime, 'A');
    const spriteB = makeSpriteTarget(runtime, 'B');
    const spriteC = makeSpriteTarget(runtime, 'C');
    spriteA.createVariable('a local id', 'i', Variable.SCALAR_TYPE);
    spriteA.blocks.createBlock(makeDanglingVariableBlock('block A', 'a local id', 'i'));
    spriteB.blocks.createBlock(makeDanglingVariableBlock('block B', 'a local id', 'i'));
    spriteC.blocks.createBlock(makeDanglingVariableBlock('block C', 'a local id', 'i'));

    const extensions = {extensionIDs: new Set(), extensionURLs: new Map()};
    vm.installTargets([stage, spriteA, spriteB, spriteC], extensions, true).then(() => {
        t.equal(Object.keys(stage.variables).length, 0, 'no global created');
        t.same(Object.keys(spriteA.variables), ['a local id'], 'A untouched');
        t.same(Object.keys(spriteB.variables), ['a local id'], 'B has its own local under the id');
        t.same(Object.keys(spriteC.variables), ['a local id'], 'C has its own local under the id');
        t.not(spriteB.variables['a local id'], spriteA.variables['a local id'], 'B\'s local is distinct from A\'s');
        t.not(spriteC.variables['a local id'], spriteB.variables['a local id'], 'C\'s local is distinct from B\'s');
        t.end();
    });
});

test('installTargets does not merge id-less references from different sprites', t => {
    // A field serialized as a one-element array has no id, and the reference
    // collector files every such field under the key "undefined". Two sprites with
    // id-less fields share nothing, so each keeps the per-sprite behavior.
    const vm = new VirtualMachine();
    const runtime = vm.runtime;
    const stage = makeStageTarget(runtime);
    const spriteA = makeSpriteTarget(runtime, 'A');
    const spriteB = makeSpriteTarget(runtime, 'B');
    spriteA.blocks.createBlock(makeDanglingVariableBlock('block A', undefined, 'score'));
    spriteB.blocks.createBlock(makeDanglingVariableBlock('block B', undefined, 'score'));

    const extensions = {extensionIDs: new Set(), extensionURLs: new Map()};
    vm.installTargets([stage, spriteA, spriteB], extensions, true).then(() => {
        t.equal(Object.keys(stage.variables).length, 0, 'no global created');
        const aVars = Object.values(spriteA.variables);
        const bVars = Object.values(spriteB.variables);
        t.equal(aVars.length, 1, 'A has its own variable');
        t.equal(bVars.length, 1, 'B has its own variable');
        t.equal(aVars[0].name, 'score');
        t.equal(bVars[0].name, 'score');
        t.not(aVars[0], bVars[0], 'the two are distinct');
        t.end();
    });
});

test('installTargets judges a shadowing local by each referring sprite\'s own field name', t => {
    // Two sprites reference the same missing id under different stale names, and
    // one of them owns a local matching its own name. That sprite would have
    // resolved to its local by name, so no global is restored.
    const vm = new VirtualMachine();
    const runtime = vm.runtime;
    const stage = makeStageTarget(runtime);
    const spriteA = makeSpriteTarget(runtime, 'A');
    const spriteB = makeSpriteTarget(runtime, 'B');
    spriteA.blocks.createBlock(makeDanglingVariableBlock('block A', 'missing id', 'score'));
    spriteB.createVariable('b points id', 'points', Variable.SCALAR_TYPE);
    spriteB.blocks.createBlock(makeDanglingVariableBlock('block B', 'missing id', 'points'));

    const extensions = {extensionIDs: new Set(), extensionURLs: new Map()};
    vm.installTargets([stage, spriteA, spriteB], extensions, true).then(() => {
        t.equal(Object.keys(stage.variables).length, 0, 'no global restored');
        t.equal(spriteB.blocks.getBlock('block B').fields.VARIABLE.id, 'b points id', 'B resolved to its local');
        t.same(Object.keys(spriteB.variables), ['b points id'], 'B has only its own local');
        t.same(Object.keys(spriteA.variables), ['missing id'], 'A created its own local');
        t.equal(spriteA.variables['missing id'].name, 'score');
        t.end();
    });
});

test('installTargets does NOT rename clean local-vs-global name collisions on whole-project load', t => {
    // Regression guard: a project saved with a sprite-local variable that name-collides with
    // a stage global must load unchanged. The fixUpVariableReferences rename behavior is
    // for sprite import; project load uses the repair-only helper.
    const vm = new VirtualMachine();
    const runtime = vm.runtime;

    const stageSprite = new Sprite(null, runtime);
    const stage = stageSprite.createClone();
    stage.isStage = true;
    stage.getName = () => 'Stage';
    stage.createVariable('global score id', 'score', Variable.SCALAR_TYPE);

    const spriteSprite = new Sprite(null, runtime);
    const sprite = spriteSprite.createClone();
    sprite.isStage = false;
    sprite.getName = () => 'Sprite';
    sprite.createVariable('local score id', 'score', Variable.SCALAR_TYPE);
    // Block referencing the sprite-local variable with the same name as the global.
    sprite.blocks.createBlock({
        id: 'a block',
        opcode: 'data_variable',
        inputs: {},
        fields: {
            VARIABLE: {
                name: 'VARIABLE',
                id: 'local score id',
                value: 'score',
                variableType: Variable.SCALAR_TYPE
            }
        },
        next: null,
        topLevel: true,
        parent: null,
        shadow: false,
        x: 0,
        y: 0
    });

    const extensions = {extensionIDs: new Set(), extensionURLs: new Map()};
    vm.installTargets([stage, sprite], extensions, true).then(() => {
        t.equal(sprite.variables['local score id'].name, 'score',
            'sprite local variable name unchanged after whole-project load');
        t.equal(sprite.blocks.getBlock('a block').fields.VARIABLE.id, 'local score id',
            'block field id unchanged');
        t.equal(Object.keys(stage.variables).length, 1, 'no new stage variables created');

        t.end();
    });
});

test('Setting turbo mode emits events', t => {
    let turboMode = null;

    const vm = new VirtualMachine();

    vm.addListener('TURBO_MODE_ON', () => {
        turboMode = true;
    });
    vm.addListener('TURBO_MODE_OFF', () => {
        turboMode = false;
    });

    vm.setTurboMode(true);
    t.equal(turboMode, true);

    vm.setTurboMode(false);
    t.equal(turboMode, false);

    t.end();
});

test('Getting the renderer returns the renderer', t => {
    const renderer = new Renderer();
    const vm = new VirtualMachine();
    vm.attachRenderer(renderer);
    t.equal(vm.renderer, renderer);
    t.end();
});

test('Starting the VM emits an event', t => {
    let started = false;
    const vm = new VirtualMachine();
    vm.addListener('RUNTIME_STARTED', () => {
        started = true;
    });
    vm.start();
    t.equal(started, true);
    vm.quit();
    t.end();
});

test('vm.greenFlag() emits a PROJECT_START event', t => {
    let greenFlagged = false;
    const vm = new VirtualMachine();
    vm.addListener('PROJECT_START', () => {
        greenFlagged = true;
    });
    vm.greenFlag();
    t.equal(greenFlagged, true);
    t.end();
});

test('toJSON encodes Infinity/NaN as 0, not null', t => {
    const vm = new VirtualMachine();
    const runtime = vm.runtime;
    const spr1 = new Sprite(null, runtime);
    const stage = spr1.createClone();
    stage.isStage = true;
    stage.volume = Infinity;
    stage.tempo = NaN;
    stage.createVariable('id1', 'name1', '');
    stage.variables.id1.value = Infinity;
    stage.createVariable('id2', 'name2', '');
    stage.variables.id1.value = -Infinity;
    stage.createVariable('id3', 'name3', '');
    stage.variables.id1.value = NaN;

    runtime.targets = [stage];

    const json = JSON.parse(vm.toJSON());
    t.equal(json.targets[0].volume, 0);
    t.equal(json.targets[0].tempo, 0);
    t.equal(json.targets[0].variables.id1[1], 0);
    t.equal(json.targets[0].variables.id2[1], 0);
    t.equal(json.targets[0].variables.id3[1], 0);

    t.end();
});

test('clearFlyoutBlocks removes all of the flyout blocks', t => {
    const vm = new VirtualMachine();
    const flyoutBlocks = vm.runtime.flyoutBlocks;

    flyoutBlocks.createBlock(adapter(events.mockVariableBlock)[0]);
    t.equal(Object.keys(flyoutBlocks._blocks).length, 1);

    vm.clearFlyoutBlocks();
    t.equal(Object.keys(flyoutBlocks._blocks).length, 0);

    t.end();
});
