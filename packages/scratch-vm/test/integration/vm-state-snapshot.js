/**
 * VM State Snapshot Test
 *
 * Loads SB3/SB2 fixtures and compares the resulting VM state against stored
 * snapshots in tap-snapshots/vm-state-snapshot/.  Intended for cross-version
 * compatibility testing:
 *
 *   1. On the reference version, generate snapshots:
 *        TAP_SNAPSHOT=1 npm test -- test/integration/vm-state-snapshot.js
 *
 *   2. Copy tap-snapshots/vm-state-snapshot/ to the target version.
 *
 *   3. Run on the target version — the test fails if VM state differs.
 */

const fs = require('fs');
const path = require('path');
const test = require('tap').test;
const FIXTURES_DIR = path.resolve(__dirname, '../fixtures');
const SNAPSHOT_DIR = path.resolve(__dirname, '../../tap-snapshots');
const makeTestStorage = require('../fixtures/make-test-storage');
const patchTimers = require('../fixtures/patch-timers');
const readFileToBuffer = require('../fixtures/readProjectFile').readFileToBuffer;
const VirtualMachine = require('../../src/virtual-machine');

// To test a subset, replace with a literal array of fixture names, e.g.:
//   const FIXTURES = ['procedure.sb2', 'monitors.sb3'];
const FIXTURES = fs.readdirSync(FIXTURES_DIR, {recursive: true, withFileTypes: true})
    .filter(f => f.isFile() && (f.name.endsWith('.sb2') || f.name.endsWith('.sb3')))
    .map(f => path.relative(FIXTURES_DIR, path.join(f.parentPath, f.name)))
    // Filter out projects that cause intentional load errors or hang on vm.quit().
    .filter(name => ![
        'missing_png.sb2',
        'missing_png.sb3',
        'missing_sound.sb3',
        'missing_svg.sb2',
        'missing_svg.sb3',
        'sb2-from-sb1-missing-backdrop-image.sb2',
        'visible-video-monitor-and-video-blocks.sb2',
        'visible-video-monitor-no-other-video-blocks.sb2',
        'load-extensions/music-visible-monitor-no-blocks.sb2',
        'load-extensions/confirm-load/videoSensing-simple-project.sb2',
        'load-extensions/confirm-load/videoSensing-simple-project.sb3',
        'load-extensions/confirm-load/wedo2-simple-project.sb3',
        'load-extensions/video-state/videoState-off.sb2',
        'load-extensions/video-state/videoState-on-transparency-0.sb2'
    ].includes(name))
    .sort();

/**
 * Build a single block node with child blocks embedded inline.
 * Child inputs are embedded recursively; SUBSTACK/SUBSTACK2 inputs become
 * flat arrays via `buildSeq`. Dropped: id, parent, topLevel, x, y.
 * @param {string} id - block ID to build
 * @param {Record<string, any>} blocks - flat block map from vm.toJSON()
 * @param {Map<string, string>} varIdMap - variable/list/broadcast ID normalization map
 * @param {Function} buildSeq - callback for building script sequences (avoids forward ref)
 * @returns {object|null} block node, or null if ID not found
 */
const buildBlockNode = function (id, blocks, varIdMap, buildSeq) {
    const b = blocks[id];
    if (!b) return null;

    // Compact freestanding primitive block (numeric string keys, no opcode)
    if (typeof b['2'] === 'string') {
        return {primitive: b['0'], name: b['1'], varId: varIdMap.get(b['2']) || b['2']};
    }

    const node = /** @type {Record<string, any>} */ ({opcode: b.opcode});
    if (b.shadow) node.shadow = true;

    if (b.fields && Object.keys(b.fields).length > 0) {
        node.fields = {};
        for (const [key, field] of Object.entries(b.fields)) {
            const f = [...field];
            if (typeof f[1] === 'string') f[1] = varIdMap.get(f[1]) || f[1];
            node.fields[key] = f;
        }
    }

    if (b.inputs && Object.keys(b.inputs).length > 0) {
        node.inputs = {};
        for (const [key, inp] of Object.entries(b.inputs)) {
            const embed = (/** @type {any} */ val) => {
                if (typeof val !== 'string') {
                    // Inline primitive: null, bare value, or [type, name, varId]
                    if (Array.isArray(val) && typeof val[2] === 'string') {
                        const r = [...val];
                        r[2] = varIdMap.get(r[2]) || r[2];
                        return r;
                    }
                    return val;
                }
                if (!blocks[val]) return null; // dangling block reference
                if (key === 'SUBSTACK' || key === 'SUBSTACK2') {
                    return buildSeq(val, blocks, varIdMap);
                }
                return buildBlockNode(val, blocks, varIdMap, buildSeq);
            };
            const entry = [inp[0], embed(inp[1])];
            if (inp.length > 2) entry.push(embed(inp[2]));
            node.inputs[key] = entry;
        }
    }

    if (b.mutation) {
        const m = /** @type {Record<string, any>} */ ({});
        if ('proccode' in b.mutation) m.proccode = b.mutation.proccode;
        if ('argumentnames' in b.mutation) m.argumentnames = b.mutation.argumentnames;
        if ('warp' in b.mutation) m.warp = b.mutation.warp;
        if (Object.keys(m).length > 0) node.mutation = m;
    }

    return node;
};

/**
 * Build a flat array of block nodes by following the `next` chain from startId.
 * Used for both top-level scripts and C-block SUBSTACK sequences.
 * @param {string} startId - ID of the first block in the sequence
 * @param {Record<string, any>} blocks - flat block map from vm.toJSON()
 * @param {Map<string, string>} varIdMap - variable/list/broadcast ID normalization map
 * @returns {Array<object>} sequence of block nodes
 */
const buildScriptSequence = function (startId, blocks, varIdMap) {
    const seq = [];
    let id = startId;
    while (id && blocks[id]) {
        seq.push(buildBlockNode(id, blocks, varIdMap, buildScriptSequence));
        id = blocks[id].next;
    }
    return seq;
};

/**
 * Capture a deterministic snapshot of the VM's state after loading a project.
 * Calls vm.toJSON() then restructures blocks into SB2-style nested trees
 * ordered by vm.runtime.targets[i].blocks._scripts (execution order).
 * @param {VirtualMachine} vm
 * @returns {object}
 */
const captureVMState = function (vm) {
    const projectJson = JSON.parse(vm.toJSON());

    delete projectJson.meta.agent;
    delete projectJson.meta.vm;

    // ── Normalize intentional scratch-blocks@^2 procedure changes ──────────
    //
    // 1. procedures_prototype.shadow: true → false (prototype is no longer a shadow)
    // 2. procedures_definition custom_block input type: 1 → 2 (non-shadow)
    // 3. Argument reporter children of procedures_prototype: present → absent
    //    (new scratch-blocks omits them from the VM store; managed by
    //    Blockly's domToMutation and not part of VM execution state)
    //
    // This runs before building the block tree so removed blocks do not appear.
    for (const target of projectJson.targets) {
        for (const block of Object.values(target.blocks)) {
            if (block.opcode === 'procedures_prototype') {
                delete block.shadow;
                for (const inp of Object.values(block.inputs || {})) {
                    const childId = inp[1]; // raw SB3 format: [type, blockId]
                    const child = childId && target.blocks[childId];
                    if (child && (child.opcode === 'argument_reporter_string_number' ||
                                  child.opcode === 'argument_reporter_boolean')) {
                        delete target.blocks[childId];
                    }
                }
                block.inputs = {};
            }
            if (block.opcode === 'procedures_definition' &&
                block.inputs && block.inputs.custom_block) {
                const inp = [...block.inputs.custom_block];
                inp[0] = 2; // 2 = non-shadow (new behavior)
                block.inputs.custom_block = inp;
            }
        }
    }

    // Build global ID map first — sprites can reference Stage (global) variables.
    const globalVarIdMap = new Map();
    for (const target of projectJson.targets) {
        for (const [id, [name]] of Object.entries(target.variables || {})) {
            globalVarIdMap.set(id, `var:${name}`);
        }
        for (const [id, [name]] of Object.entries(target.lists || {})) {
            globalVarIdMap.set(id, `list:${name}`);
        }
        for (const [id, [name]] of Object.entries(target.broadcasts || {})) {
            globalVarIdMap.set(id, `broadcast:${name}`);
        }
    }

    const rewriteVarKeys = /** @type {(obj: any) => any} */ (obj => Object.fromEntries(
        Object.entries(obj || {}).map(([id, val]) => [globalVarIdMap.get(id) || id, val])
    ));

    // Stage first, then sprites in runtime order (execution order — do not sort).
    const targets = vm.runtime.targets
        .filter(t => t.isOriginal)
        .sort((a, b) => (a.isStage === b.isStage ? 0 : a.isStage ? -1 : 1))
        .flatMap(runtimeTarget => {
            const name = runtimeTarget.isStage ? 'Stage' : runtimeTarget.sprite.name;
            const ser = projectJson.targets.find(/** @type {(t: any) => boolean} */ (t =>
                runtimeTarget.isStage ? t.isStage : t.name === name
            ));
            if (!ser) return [];

            const blocks = ser.blocks || {};

            const scriptIds = runtimeTarget.blocks._scripts || [];
            const scripts = scriptIds
                .filter(/** @type {(id: string) => boolean} */ (id => Boolean(blocks[id])))
                .map(/** @type {(id: string) => any[]} */ (id =>
                    buildScriptSequence(id, blocks, globalVarIdMap)
                ));

            const {
                id: _id, // random runtime ID — not stable
                blocks: _blocks, // replaced by scripts
                comments: _comments, // layout state, not VM execution state
                ...rest
            } = ser;

            return [{
                ...rest,
                name,
                variables: rewriteVarKeys(ser.variables),
                lists: rewriteVarKeys(ser.lists),
                broadcasts: rewriteVarKeys(ser.broadcasts),
                scripts
            }];
        });

    // Monitor IDs embed a random target ID; replace with a stable derived key.
    const snapshot = /** @type {Record<string, any>} */ ({
        meta: projectJson.meta,
        extensions: projectJson.extensions,
        targets
    });
    if (projectJson.monitors) {
        snapshot.monitors = projectJson.monitors
            .map(/** @type {(m: any) => any} */ (m => ({
                ...m,
                id: [m.spriteName || '', m.opcode, JSON.stringify(m.params)].join('_')
            })))
            .sort((/** @type {any} */ a, /** @type {any} */ b) => a.id.localeCompare(b.id));
    }
    return snapshot;
};

FIXTURES.forEach(name => {
    test(`vm-state-snapshot: ${name}`, async t => {
        const vm = new VirtualMachine();
        vm.attachStorage(makeTestStorage());

        const projectBuffer = readFileToBuffer(path.resolve(FIXTURES_DIR, name));

        const timers = patchTimers();

        try {
            await Promise.race([
                vm.loadProject(projectBuffer),
                new Promise((_, reject) => {
                    const timer = timers.origSetTimeout(() => {
                        reject(new Error(`Timed out loading ${name}`));
                    }, 10000);
                    timer.unref(); // don't let this timer keep the process alive
                })
            ]);
        } catch (err) {
            timers.restore();
            t.fail(err instanceof Error ? err.message : String(err));
            vm.quit();
            return;
        }

        const state = captureVMState(vm);
        const snapshotFile = path.join(SNAPSHOT_DIR, 'vm-state-snapshot', `${name}.json`);
        if (process.env.TAP_SNAPSHOT) {
            fs.mkdirSync(path.dirname(snapshotFile), {recursive: true});
            fs.writeFileSync(snapshotFile, JSON.stringify(state, null, 2) + '\n');
            t.pass(`wrote snapshot for ${name}`);
        } else {
            const expected = JSON.parse(fs.readFileSync(snapshotFile, 'utf8'));
            t.same(state, expected, `VM state for ${name}`);
        }
        vm.quit();
        timers.restore();

        const liveTimers = timers.getLiveTimers();
        if (liveTimers.length) {
            const messageLines = [`WARNING: ${name} left ${liveTimers.length} timer(s) alive after vm.quit():`];
            for (const id of liveTimers) {
                const fn = (/** @type {any} */ (id))._onTimeout;
                const fnName = fn ? (fn.name || fn.toString().slice(0, 60)) : '(unknown)';
                messageLines.push(`  ${id.constructor.name} with callback ${fnName}`);
            }
            t.error(messageLines.join('\n'));
        }
    });
});
