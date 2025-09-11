const test = require('tap').test;
const Mouse = require('../../src/io/mouse');
const Runtime = require('../../src/engine/runtime');

test('spec', t => {
    const rt = new Runtime();
    const m = new Mouse(rt);

    t.type(m, 'object');
    t.type(m.postData, 'function');
    t.type(m.getClientX, 'function');
    t.type(m.getClientY, 'function');
    t.type(m.getScratchX, 'function');
    t.type(m.getScratchY, 'function');
    t.type(m.getIsDown, 'function');
    t.end();
});

test('mouseUp', t => {
    const rt = new Runtime();
    const m = new Mouse(rt);

    m.postData({
        x: -20,
        y: 10,
        isDown: false,
        canvasWidth: 480,
        canvasHeight: 360
    });
    t.equal(m.getClientX(), -20);
    t.equal(m.getClientY(), 10);
    t.equal(m.getScratchX(), -240);
    t.equal(m.getScratchY(), 170);
    t.equal(m.getIsDown(), false);
    t.end();
});

test('mouseDown', t => {
    const rt = new Runtime();
    const m = new Mouse(rt);

    m.postData({
        x: 9.9,
        y: 400.1,
        isDown: true,
        canvasWidth: 480,
        canvasHeight: 360
    });
    t.equal(m.getClientX(), 9.9);
    t.equal(m.getClientY(), 400.1);
    t.equal(m.getScratchX(), -230);
    t.equal(m.getScratchY(), -180);
    t.equal(m.getIsDown(), true);
    t.end();
});

test('at zoomed scale', t => {
    const rt = new Runtime();
    const m = new Mouse(rt);

    m.postData({
        x: 240,
        y: 540,
        canvasWidth: 960,
        canvasHeight: 720
    });
    t.equal(m.getClientX(), 240);
    t.equal(m.getClientY(), 540);
    t.equal(m.getScratchX(), -120);
    t.equal(m.getScratchY(), -90);
    t.end();
});

test('mousedown activating click hats', t => {
    const rt = new Runtime();
    const m = new Mouse(rt);

    const mouseMoveEvent = {
        x: 10,
        y: 100,
        canvasWidth: 480,
        canvasHeight: 360
    };

    const dummyTarget = {
        draggable: false
    };

    const mouseDownEvent = Object.assign({}, mouseMoveEvent, {
        isDown: true
    });

    const mouseUpEvent = Object.assign({}, mouseMoveEvent, {
        isDown: false
    });

    // Stub activateClickHats and pick function for testing
    let ranClickHats = false;
    m._activateClickHats = () => {
        ranClickHats = true;
    };
    m._pickTarget = () => dummyTarget;

    // Mouse move without mousedown
    m.postData(mouseMoveEvent);
    t.equal(ranClickHats, false);

    // Mouse down event triggers the hats if target is not draggable
    dummyTarget.draggable = false;
    m.postData(mouseDownEvent);
    t.equal(ranClickHats, true);

    // But another mouse move while down doesn't trigger
    ranClickHats = false;
    m.postData(mouseDownEvent);
    t.equal(ranClickHats, false);

    // And it does trigger on mouse up if target is draggable
    ranClickHats = false;
    dummyTarget.draggable = true;
    m.postData(mouseUpEvent);
    t.equal(ranClickHats, true);

    // And hats don't trigger if mouse down is outside canvas
    ranClickHats = false;
    m.postData(Object.assign({}, mouseDownEvent, {
        x: 50000,
        y: 50
    }));
    t.equal(ranClickHats, false);

    t.end();
});
