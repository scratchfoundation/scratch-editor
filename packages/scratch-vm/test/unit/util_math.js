const test = require('tap').test;
const math = require('../../src/util/math-util');

test('degToRad', t => {
    t.equal(math.degToRad(0), 0);
    t.equal(math.degToRad(1), 0.017453292519943295);
    t.equal(math.degToRad(180), Math.PI);
    t.equal(math.degToRad(360), 2 * Math.PI);
    t.equal(math.degToRad(720), 4 * Math.PI);
    t.end();
});

test('radToDeg', t => {
    t.equal(math.radToDeg(0), 0);
    t.equal(math.radToDeg(1), 57.29577951308232);
    t.equal(math.radToDeg(180), 10313.240312354817);
    t.equal(math.radToDeg(360), 20626.480624709635);
    t.equal(math.radToDeg(720), 41252.96124941927);
    t.end();
});

test('clamp', t => {
    t.equal(math.clamp(0, 0, 10), 0);
    t.equal(math.clamp(1, 0, 10), 1);
    t.equal(math.clamp(-10, 0, 10), 0);
    t.equal(math.clamp(100, 0, 10), 10);
    t.end();
});

test('wrapClamp', t => {
    t.equal(math.wrapClamp(0, 0, 10), 0);
    t.equal(math.wrapClamp(1, 0, 10), 1);
    t.equal(math.wrapClamp(-10, 0, 10), 1);
    t.equal(math.wrapClamp(100, 0, 10), 1);
    t.end();
});

test('tan', t => {
    t.equal(math.tan(90), Infinity);
    t.equal(math.tan(180), 0);
    t.equal(math.tan(-90), -Infinity);
    t.equal(math.tan(33), 0.6494075932);
    t.end();
});

test('reducedSortOrdering', t => {
    t.same(math.reducedSortOrdering([5, 18, 6, 3]), [1, 3, 2, 0]);
    t.same(math.reducedSortOrdering([5, 1, 56, 19]), [1, 0, 3, 2]);
    t.end();
});

test('inclusiveRandIntWithout', t => {
    const withRandomValue = function (randValue, ...args) {
        const oldMathRandom = Math.random;
        Object.assign(global.Math, {random: () => randValue});
        const result = math.inclusiveRandIntWithout(...args);
        Object.assign(global.Math, {random: oldMathRandom});
        return result;
    };

    t.equal(withRandomValue(3 / 6, 0, 6, 2), 4);
    t.equal(withRandomValue(2 / 6, 0, 6, 2), 3);
    t.equal(withRandomValue(1 / 6, 0, 6, 2), 1);
    t.equal(withRandomValue(1.9 / 6, 0, 6, 2), 1);

    t.equal(withRandomValue(3 / 4, 10, 14, 10), 14);
    t.equal(withRandomValue(0 / 4, 10, 14, 10), 11);

    t.end();
});
