const test = require('tap').test;

// Mock `window` and `document.createElement` for twgl.js.
global.window = {};
global.document = {
    createElement: () => ({getContext: () => {}})
};

const Drawable = require('../../src/Drawable');
const MockSkin = require('../fixtures/MockSkin');
const Rectangle = require('../../src/Rectangle');

/**
 * Returns a Rectangle-like object, with dimensions rounded to the given number
 * of digits.
 * @param {Rectangle} rect The source rectangle.
 * @param {int} decimals The number of decimal points to snap to.
 * @returns {object} An object with left/right/top/bottom attributes.
 */
const snapToNearest = function (rect, decimals = 3) {
    return {
        left: rect.left.toFixed(decimals),
        right: rect.right.toFixed(decimals),
        bottom: rect.bottom.toFixed(decimals),
        top: rect.top.toFixed(decimals)
    };
};

test('translate by position', t => {
    const expected = new Rectangle();
    const drawable = new Drawable();
    drawable.skin = new MockSkin();
    drawable.skin.size = [200, 50];

    expected.initFromBounds(0, 200, -50, 0);
    t.same(snapToNearest(drawable.getAABB()), expected);

    drawable.updateProperties({position: [1, 2]});
    expected.initFromBounds(1, 201, -48, 2);
    t.same(snapToNearest(drawable.getAABB()), expected);

    t.end();
});

test('translate by costume center', t => {
    const expected = new Rectangle();
    const drawable = new Drawable();
    drawable.skin = new MockSkin();
    drawable.skin.size = [200, 50];

    drawable.skin.setRotationCenter(1, 0);
    expected.initFromBounds(-1, 199, -50, 0);
    t.same(snapToNearest(drawable.getAABB()), expected);

    drawable.skin.setRotationCenter(0, -2);
    expected.initFromBounds(0, 200, -52, -2);
    t.same(snapToNearest(drawable.getAABB()), expected);

    t.end();
});

test('translate and rotate', t => {
    const expected = new Rectangle();
    const drawable = new Drawable();
    drawable.skin = new MockSkin();
    drawable.skin.size = [200, 50];

    drawable.updateProperties({position: [1, 2], direction: 0});
    expected.initFromBounds(1, 51, 2, 202);
    t.same(snapToNearest(drawable.getAABB()), expected);

    drawable.updateProperties({direction: 180});
    expected.initFromBounds(-49, 1, -198, 2);
    t.same(snapToNearest(drawable.getAABB()), expected);

    drawable.skin.setRotationCenter(100, 25);
    drawable.updateProperties({direction: 270, position: [0, 0]});
    expected.initFromBounds(-100, 100, -25, 25);
    t.same(snapToNearest(drawable.getAABB()), expected);

    drawable.updateProperties({direction: 90});
    t.same(snapToNearest(drawable.getAABB()), expected);

    t.end();
});

test('rotate by non-right-angles', t => {
    const expected = new Rectangle();
    const drawable = new Drawable();
    drawable.skin = new MockSkin();
    drawable.skin.size = [10, 10];
    drawable.skin.setRotationCenter(5, 5);

    expected.initFromBounds(-5, 5, -5, 5);
    t.same(snapToNearest(drawable.getAABB()), expected);

    drawable.updateProperties({direction: 45});
    expected.initFromBounds(-7.071, 7.071, -7.071, 7.071);
    t.same(snapToNearest(drawable.getAABB()), expected);

    t.end();
});

test('scale', t => {
    const expected = new Rectangle();
    const drawable = new Drawable();
    drawable.skin = new MockSkin();
    drawable.skin.size = [200, 50];

    drawable.updateProperties({scale: [100, 50]});
    expected.initFromBounds(0, 200, -25, 0);
    t.same(snapToNearest(drawable.getAABB()), expected);

    drawable.skin.setRotationCenter(0, 25);
    expected.initFromBounds(0, 200, -12.5, 12.5);
    t.same(snapToNearest(drawable.getAABB()), expected);

    drawable.skin.setRotationCenter(150, 50);
    drawable.updateProperties({scale: [50, 50]});
    expected.initFromBounds(-75, 25, 0, 25);
    t.same(snapToNearest(drawable.getAABB()), expected);

    t.end();
});

test('rotate and scale', t => {
    const expected = new Rectangle();
    const drawable = new Drawable();
    drawable.skin = new MockSkin();
    drawable.skin.size = [100, 1000];

    drawable.skin.setRotationCenter(50, 50);
    expected.initFromBounds(-50, 50, -950, 50);
    t.same(snapToNearest(drawable.getAABB()), expected);

    drawable.updateProperties({scale: [40, 60]});
    drawable.skin.setRotationCenter(50, 50);
    expected.initFromBounds(-20, 20, -570, 30);
    t.same(snapToNearest(drawable.getAABB()), expected);

    t.end();
});
