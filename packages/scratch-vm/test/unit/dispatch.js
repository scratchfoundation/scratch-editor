const path = require('path');
const tap = require('tap');

// make Worker available globally before requiring VM/dispatch code
const Worker = require('web-worker');
tap.intercept(global, 'Worker', {value: Worker});

const dispatch = require('../../src/dispatch/central-dispatch');

const DispatchTestService = require('../fixtures/dispatch-test-service');

const {test} = tap;

const runServiceTest = function (serviceName, t) {
    const promises = [];

    promises.push(dispatch.call(serviceName, 'returnFortyTwo')
        .then(
            x => t.equal(x, 42),
            e => t.fail(e)
        ));

    promises.push(dispatch.call(serviceName, 'doubleArgument', 9)
        .then(
            x => t.equal(x, 18),
            e => t.fail(e)
        ));

    promises.push(dispatch.call(serviceName, 'doubleArgument', 123)
        .then(
            x => t.equal(x, 246),
            e => t.fail(e)
        ));

    // I tried using `t.rejects` here but ran into https://github.com/tapjs/node-tap/issues/384
    promises.push(dispatch.call(serviceName, 'throwException')
        .then(
            () => t.fail('exception was not propagated as expected'),
            () => t.pass('exception was propagated as expected')
        ));

    return Promise.all(promises);
};

test('local', t => {
    dispatch.setService('LocalDispatchTest', new DispatchTestService())
        .catch(e => t.fail(e));

    return runServiceTest('LocalDispatchTest', t);
});

test('remote', t => {
    const fixturesDir = path.resolve(__dirname, '../fixtures');
    const shimPath = path.resolve(fixturesDir, 'dispatch-test-worker-shim.js');
    const worker = new Worker(shimPath, null, {cwd: fixturesDir});
    dispatch.addWorker(worker);

    const waitForWorker = new Promise(resolve => {
        dispatch.setService('test', {onWorkerReady: resolve})
            .catch(e => t.fail(e));
    });

    return waitForWorker
        .then(() => runServiceTest('RemoteDispatchTest', t), e => t.fail(e))
        .then(() => dispatch._remoteCall(worker, 'dispatch', 'terminate'), e => t.fail(e));
});

test('local, sync', t => {
    dispatch.setServiceSync('SyncDispatchTest', new DispatchTestService());

    const a = dispatch.callSync('SyncDispatchTest', 'returnFortyTwo');
    t.equal(a, 42);

    const b = dispatch.callSync('SyncDispatchTest', 'doubleArgument', 9);
    t.equal(b, 18);

    const c = dispatch.callSync('SyncDispatchTest', 'doubleArgument', 123);
    t.equal(c, 246);

    t.throws(() => dispatch.callSync('SyncDispatchTest', 'throwException'),
        new Error('This is a test exception thrown by DispatchTest'));

    t.end();
});
