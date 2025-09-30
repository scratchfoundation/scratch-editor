const path = require('path');
const tap = require('tap');

// make Worker available globally before requiring VM/dispatch code
const Worker = require('web-worker');
tap.intercept(global, 'Worker', {value: Worker});

const makeTestStorage = require('../fixtures/make-test-storage');
const readFileToBuffer = require('../fixtures/readProjectFile').readFileToBuffer;
const VirtualMachine = require('../../src/index');

const uri = path.resolve(__dirname, '../fixtures/saythink-and-wait.sb2');
const project = readFileToBuffer(uri);

const {test} = tap;

test('say/think and wait', t => {
    const vm = new VirtualMachine();
    vm.attachStorage(makeTestStorage());

    // Start VM, load project, and run
    t.doesNotThrow(() => {
        vm.start();
        vm.clear();
        vm.setCompatibilityMode(false);
        vm.setTurboMode(false);
        vm.loadProject(project).then(() => {
            vm.greenFlag();

            // After two seconds, stop the project.
            // The test will fail if the project throws.
            setTimeout(() => {
                vm.stopAll();
                vm.quit();
                t.end();
            }, 2000);
        });
    });
});
