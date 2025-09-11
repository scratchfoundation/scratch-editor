const test = require('tap').test;
const cast = require('../../src/util/cast');

test('toNumber', t => {
    // Numeric
    t.equal(cast.toNumber(0), 0);
    t.equal(cast.toNumber(1), 1);
    t.equal(cast.toNumber(3.14), 3.14);

    // String
    t.equal(cast.toNumber('0'), 0);
    t.equal(cast.toNumber('1'), 1);
    t.equal(cast.toNumber('3.14'), 3.14);
    t.equal(cast.toNumber('0.1e10'), 1000000000);
    t.equal(cast.toNumber('foobar'), 0);

    // Boolean
    t.equal(cast.toNumber(true), 1);
    t.equal(cast.toNumber(false), 0);
    t.equal(cast.toNumber('true'), 0);
    t.equal(cast.toNumber('false'), 0);

    // Undefined & object
    t.equal(cast.toNumber(undefined), 0);
    t.equal(cast.toNumber({}), 0);
    t.equal(cast.toNumber(NaN), 0);
    t.end();
});

test('toBoolean', t => {
    // Numeric
    t.equal(cast.toBoolean(0), false);
    t.equal(cast.toBoolean(1), true);
    t.equal(cast.toBoolean(3.14), true);

    // String
    t.equal(cast.toBoolean('0'), false);
    t.equal(cast.toBoolean('1'), true);
    t.equal(cast.toBoolean('3.14'), true);
    t.equal(cast.toBoolean('0.1e10'), true);
    t.equal(cast.toBoolean('foobar'), true);

    // Boolean
    t.equal(cast.toBoolean(true), true);
    t.equal(cast.toBoolean(false), false);

    // Undefined & object
    t.equal(cast.toBoolean(undefined), false);
    t.equal(cast.toBoolean({}), true);
    t.end();
});

test('toString', t => {
    // Numeric
    t.equal(cast.toString(0), '0');
    t.equal(cast.toString(1), '1');
    t.equal(cast.toString(3.14), '3.14');

    // String
    t.equal(cast.toString('0'), '0');
    t.equal(cast.toString('1'), '1');
    t.equal(cast.toString('3.14'), '3.14');
    t.equal(cast.toString('0.1e10'), '0.1e10');
    t.equal(cast.toString('foobar'), 'foobar');

    // Boolean
    t.equal(cast.toString(true), 'true');
    t.equal(cast.toString(false), 'false');

    // Undefined & object
    t.equal(cast.toString(undefined), 'undefined');
    t.equal(cast.toString({}), '[object Object]');
    t.end();
});

test('toRgbColorList', t => {
    // Hex (minimal, see "color" util tests)
    t.same(cast.toRgbColorList('#000'), [0, 0, 0]);
    t.same(cast.toRgbColorList('#000000'), [0, 0, 0]);
    t.same(cast.toRgbColorList('#fff'), [255, 255, 255]);
    t.same(cast.toRgbColorList('#ffffff'), [255, 255, 255]);

    // Decimal (minimal, see "color" util tests)
    t.same(cast.toRgbColorList(0), [0, 0, 0]);
    t.same(cast.toRgbColorList(1), [0, 0, 1]);
    t.same(cast.toRgbColorList(16777215), [255, 255, 255]);

    // Malformed
    t.same(cast.toRgbColorList('ffffff'), [0, 0, 0]);
    t.same(cast.toRgbColorList('foobar'), [0, 0, 0]);
    t.same(cast.toRgbColorList('#nothex'), [0, 0, 0]);
    t.end();
});

test('toRgbColorObject', t => {
    // Hex (minimal, see "color" util tests)
    t.same(cast.toRgbColorObject('#000'), {r: 0, g: 0, b: 0});
    t.same(cast.toRgbColorObject('#000000'), {r: 0, g: 0, b: 0});
    t.same(cast.toRgbColorObject('#fff'), {r: 255, g: 255, b: 255});
    t.same(cast.toRgbColorObject('#ffffff'), {r: 255, g: 255, b: 255});

    // Decimal (minimal, see "color" util tests)
    t.same(cast.toRgbColorObject(0), {a: 255, r: 0, g: 0, b: 0});
    t.same(cast.toRgbColorObject(1), {a: 255, r: 0, g: 0, b: 1});
    t.same(cast.toRgbColorObject(16777215), {a: 255, r: 255, g: 255, b: 255});
    t.same(cast.toRgbColorObject('0x80010203'), {a: 128, r: 1, g: 2, b: 3});

    // Malformed
    t.same(cast.toRgbColorObject('ffffff'), {a: 255, r: 0, g: 0, b: 0});
    t.same(cast.toRgbColorObject('foobar'), {a: 255, r: 0, g: 0, b: 0});
    t.same(cast.toRgbColorObject('#nothex'), {a: 255, r: 0, g: 0, b: 0});
    t.end();
});

test('compare', t => {
    // Numeric
    t.equal(cast.compare(0, 0), 0);
    t.equal(cast.compare(1, 0), 1);
    t.equal(cast.compare(0, 1), -1);
    t.equal(cast.compare(1, 1), 0);

    // String
    t.equal(cast.compare('0', '0'), 0);
    t.equal(cast.compare('0.1e10', '1000000000'), 0);
    t.equal(cast.compare('foobar', 'FOOBAR'), 0);
    t.ok(cast.compare('dog', 'cat') > 0);

    // Boolean
    t.equal(cast.compare(true, true), 0);
    t.equal(cast.compare(true, false), 1);
    t.equal(cast.compare(false, true), -1);
    t.equal(cast.compare(true, true), 0);

    // Undefined & object
    t.equal(cast.compare(undefined, undefined), 0);
    t.equal(cast.compare(undefined, 'undefined'), 0);
    t.equal(cast.compare({}, {}), 0);
    t.equal(cast.compare({}, '[object Object]'), 0);
    t.end();
});

test('isInt', t => {
    // Numeric
    t.equal(cast.isInt(0), true);
    t.equal(cast.isInt(1), true);
    t.equal(cast.isInt(0.0), true);
    t.equal(cast.isInt(3.14), false);
    t.equal(cast.isInt(NaN), true);

    // String
    t.equal(cast.isInt('0'), true);
    t.equal(cast.isInt('1'), true);
    t.equal(cast.isInt('0.0'), false);
    t.equal(cast.isInt('0.1e10'), false);
    t.equal(cast.isInt('3.14'), false);

    // Boolean
    t.equal(cast.isInt(true), true);
    t.equal(cast.isInt(false), true);

    // Undefined & object
    t.equal(cast.isInt(undefined), false);
    t.equal(cast.isInt({}), false);
    t.end();
});

test('toListIndex', t => {
    const list = [0, 1, 2, 3, 4, 5];
    const empty = [];

    // Valid
    t.equal(cast.toListIndex(1, list.length, false), 1);
    t.equal(cast.toListIndex(6, list.length, false), 6);

    // Invalid
    t.equal(cast.toListIndex(-1, list.length, false), cast.LIST_INVALID);
    t.equal(cast.toListIndex(0.1, list.length, false), cast.LIST_INVALID);
    t.equal(cast.toListIndex(0, list.length, false), cast.LIST_INVALID);
    t.equal(cast.toListIndex(7, list.length, false), cast.LIST_INVALID);

    // "all"
    t.equal(cast.toListIndex('all', list.length, true), cast.LIST_ALL);
    t.equal(cast.toListIndex('all', list.length, false), cast.LIST_INVALID);

    // "last"
    t.equal(cast.toListIndex('last', list.length, false), list.length);
    t.equal(cast.toListIndex('last', empty.length, false), cast.LIST_INVALID);

    // "random"
    const random = cast.toListIndex('random', list.length, false);
    t.ok(random <= list.length);
    t.ok(random > 0);
    t.equal(cast.toListIndex('random', empty.length, false), cast.LIST_INVALID);

    // "any" (alias for "random")
    const any = cast.toListIndex('any', list.length, false);
    t.ok(any <= list.length);
    t.ok(any > 0);
    t.equal(cast.toListIndex('any', empty.length, false), cast.LIST_INVALID);
    t.end();
});
