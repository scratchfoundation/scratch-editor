const test = require('tap').test;
const Operators = require('../../src/blocks/scratch3_operators');

const blocks = new Operators(null);

test('divide: (1) / (0) = Infinity', t => {
    t.equal(
        blocks.divide({NUM1: '1', NUM2: '0'}), Infinity, '1 / 0 = Infinity'
    );

    t.end();
});

test('divide: division with Infinity', t => {
    t.equal(
        blocks.divide({NUM1: 'Infinity', NUM2: 111}), Infinity, '"Infinity" / 111 = Infinity'
    );
    t.equal(
        blocks.divide({NUM1: 'INFINITY', NUM2: 222}), 0, '"INFINITY" / 222 = 0'
    );
    t.equal(
        blocks.divide({NUM1: Infinity, NUM2: 333}), Infinity, 'Infinity / 333 = Infinity'
    );

    t.equal(
        blocks.divide({NUM1: 111, NUM2: 'Infinity'}), 0, '111 / "Infinity" = 0'
    );
    t.equal(
        blocks.divide({NUM1: 222, NUM2: 'INFINITY'}), Infinity, '222 / "INFINITY" = Infinity'
    );
    t.equal(
        blocks.divide({NUM1: 333, NUM2: Infinity}), 0, '333 / Infinity = 0'
    );

    t.equal(
        blocks.divide({NUM1: '-Infinity', NUM2: 111}), -Infinity, '"-Infinity" / 111 = -Infinity'
    );
    t.equal(
        blocks.divide({NUM1: '-INFINITY', NUM2: 222}), 0, '"-INFINITY" / 222 = 0'
    );
    t.equal(
        blocks.divide({NUM1: -Infinity, NUM2: 333}), -Infinity, '-Infinity / 333 = -Infinity'
    );

    t.equal(
        blocks.divide({NUM1: 111, NUM2: '-Infinity'}), 0, '111 / "-Infinity" = 0'
    );
    t.equal(
        blocks.divide({NUM1: 222, NUM2: '-INFINITY'}), Infinity, '222 / "-INFINITY" = Infinity'
    );
    t.equal(
        blocks.divide({NUM1: 333, NUM2: -Infinity}), 0, '333 / -Infinity = 0'
    );

    t.end();
});

test('multiply: multiply Infinity with numbers', t => {
    t.equal(
        blocks.multiply({NUM1: 'Infinity', NUM2: 111}), Infinity, '"Infinity" * 111 = Infinity'
    );
    t.equal(
        blocks.multiply({NUM1: 'INFINITY', NUM2: 222}), 0, '"INFINITY" * 222 = 0'
    );
    t.equal(
        blocks.multiply({NUM1: Infinity, NUM2: 333}), Infinity, 'Infinity * 333 = Infinity'
    );
    t.equal(
        blocks.multiply({NUM1: '-Infinity', NUM2: 111}), -Infinity, '"-Infinity" * 111 = -Infinity'
    );
    t.equal(
        blocks.multiply({NUM1: '-INFINITY', NUM2: 222}), 0, '"-INFINITY" * 222 = 0'
    );
    t.equal(
        blocks.multiply({NUM1: -Infinity, NUM2: 333}), -Infinity, '-Infinity * 333 = -Infinity'
    );
    t.equal(
        blocks.multiply({NUM1: -Infinity, NUM2: Infinity}), -Infinity, '-Infinity * Infinity = -Infinity'
    );
    t.equal(
        Number.isNaN(blocks.multiply({NUM1: Infinity, NUM2: 0})), true, 'Infinity * 0 = NaN'
    );

    t.end();
});

test('add: add Infinity to a number', t => {

    t.equal(
        blocks.add({NUM1: 'Infinity', NUM2: 111}), Infinity, '"Infinity" + 111 = Infinity'
    );
    t.equal(
        blocks.add({NUM1: 'INFINITY', NUM2: 222}), 222, '"INFINITY" + 222 = 222'
    );
    t.equal(
        blocks.add({NUM1: Infinity, NUM2: 333}), Infinity, 'Infinity + 333 = Infinity'
    );
    t.equal(
        blocks.add({NUM1: '-Infinity', NUM2: 111}), -Infinity, '"-Infinity" + 111 = -Infinity'
    );
    t.equal(
        blocks.add({NUM1: '-INFINITY', NUM2: 222}), 222, '"-INFINITY" + 222 = 222'
    );
    t.equal(
        blocks.add({NUM1: -Infinity, NUM2: 333}), -Infinity, '-Infinity + 333 = -Infinity'
    );
    t.equal(
        Number.isNaN(blocks.add({NUM1: -Infinity, NUM2: Infinity})), true, '-Infinity + Infinity = NaN'
    );

    t.end();
});

test('subtract: subtract Infinity with a number', t => {

    t.equal(
        blocks.subtract({NUM1: 'Infinity', NUM2: 111}), Infinity, '"Infinity" - 111 = Infinity'
    );
    t.equal(
        blocks.subtract({NUM1: 'INFINITY', NUM2: 222}), -222, '"INFINITY" - 222 = -222'
    );
    t.equal(
        blocks.subtract({NUM1: Infinity, NUM2: 333}), Infinity, 'Infinity - 333 = Infinity'
    );
    t.equal(
        blocks.subtract({NUM1: 111, NUM2: 'Infinity'}), -Infinity, '111 - "Infinity" = -Infinity'
    );
    t.equal(
        blocks.subtract({NUM1: 222, NUM2: 'INFINITY'}), 222, '222 - "INFINITY" = 222'
    );
    t.equal(
        blocks.subtract({NUM1: 333, NUM2: Infinity}), -Infinity, '333 - Infinity = -Infinity'
    );
    t.equal(
        Number.isNaN(blocks.subtract({NUM1: Infinity, NUM2: Infinity})), true, 'Infinity - Infinity = NaN'
    );

    t.end();
});

test('equals: compare string infinity and numeric Infinity', t => {

    t.equal(
        blocks.equals({OPERAND1: 'Infinity', OPERAND2: 'INFINITY'}), true, '"Infinity" = "INFINITY"'
    );
    t.equal(
        blocks.equals({OPERAND1: 'INFINITY', OPERAND2: 'Infinity'}), true, '"INFINITY" = "Infinity"'
    );
    t.equal(
        blocks.equals({OPERAND1: 'Infinity', OPERAND2: 'Infinity'}), true, '"Infinity" = "Infinity"'
    );
    t.equal(
        blocks.equals({OPERAND1: 'INFINITY', OPERAND2: 'INFINITY'}), true, '"INFINITY" = "INFINITY"'
    );
    t.equal(
        blocks.equals({OPERAND1: 'INFINITY', OPERAND2: 'infinity'}), true, '"INFINITY" = "infinity"'
    );

    t.equal(
        blocks.equals({OPERAND1: Infinity, OPERAND2: Infinity}), true, 'Infinity = Infinity'
    );
    t.equal(
        blocks.equals({OPERAND1: 'Infinity', OPERAND2: Infinity}), true, '"Infinity" = Infinity'
    );
    t.equal(
        blocks.equals({OPERAND1: 'INFINITY', OPERAND2: Infinity}), true, '"INFINITY" = Infinity'
    );
    t.equal(
        blocks.equals({OPERAND1: Infinity, OPERAND2: 'Infinity'}), true, 'Infinity = "Infinity"'
    );
    t.equal(
        blocks.equals({OPERAND1: Infinity, OPERAND2: 'INFINITY'}), true, 'Infinity = "INFINITY'
    );

    t.end();
});

test('equals: compare string negative infinity and numeric negative Infinity', t => {

    t.equal(
        blocks.equals({OPERAND1: '-Infinity', OPERAND2: '-INFINITY'}), true, '"-Infinity" = "-INFINITY"'
    );
    t.equal(
        blocks.equals({OPERAND1: '-INFINITY', OPERAND2: '-Infinity'}), true, '"-INFINITY" = "-Infinity"'
    );
    t.equal(
        blocks.equals({OPERAND1: '-Infinity', OPERAND2: '-Infinity'}), true, '"-Infinity" = "-Infinity"'
    );
    t.equal(
        blocks.equals({OPERAND1: '-INFINITY', OPERAND2: '-INFINITY'}), true, '"-INFINITY" = "-INFINITY"'
    );
    t.equal(
        blocks.equals({OPERAND1: '-INFINITY', OPERAND2: '-infinity'}), true, '"-INFINITY" = "-infinity"'
    );

    t.equal(
        blocks.equals({OPERAND1: -Infinity, OPERAND2: -Infinity}), true, '-Infinity = -Infinity'
    );
    t.equal(
        blocks.equals({OPERAND1: '-Infinity', OPERAND2: -Infinity}), true, '"-Infinity" = -Infinity'
    );
    t.equal(
        blocks.equals({OPERAND1: '-INFINITY', OPERAND2: -Infinity}), true, '"-INFINITY" = -Infinity'
    );
    t.equal(
        blocks.equals({OPERAND1: -Infinity, OPERAND2: '-Infinity'}), true, '-Infinity = "-Infinity"'
    );
    t.equal(
        blocks.equals({OPERAND1: -Infinity, OPERAND2: '-INFINITY'}), true, '-Infinity = "-INFINITY'
    );

    t.end();
});


test('equals: compare negative to postive string and numeric Infinity', t => {
    t.equal(
        blocks.equals({OPERAND1: '-Infinity', OPERAND2: 'Infinity'}), false, '"-Infinity" != "Infinity"'
    );
    t.equal(
        blocks.equals({OPERAND1: '-Infinity', OPERAND2: 'INFINITY'}), false, '"-infinity" != "INFINITY"'
    );
    t.equal(
        blocks.equals({OPERAND1: '-INFINITY', OPERAND2: 'Infinity'}), false, '"-INFINITY" != "Infinity"'
    );
    t.equal(
        blocks.equals({OPERAND1: '-INFINITY', OPERAND2: 'INFINITY'}), false, '"-INFINITY" != "INFINITY"'
    );

    t.equal(
        blocks.equals({OPERAND1: '-Infinity', OPERAND2: Infinity}), false, '"-Infinity" != Infinity'
    );
    t.equal(
        blocks.equals({OPERAND1: '-INFINITY', OPERAND2: Infinity}), false, '"-INFINITY" != Infinity'
    );
    t.equal(
        blocks.equals({OPERAND1: 'Infinity', OPERAND2: -Infinity}), false, '"Infinity" != -Infinity'
    );
    t.equal(
        blocks.equals({OPERAND1: 'INFINITY', OPERAND2: -Infinity}), false, '"INFINITY" != -Infinity'
    );

    t.equal(
        blocks.equals({OPERAND1: Infinity, OPERAND2: -Infinity}), false, 'Infinity != -Infinity'
    );

    t.end();
});

test('less than: compare string infinity and numeric Infinity', t => {

    t.equal(
        blocks.lt({OPERAND1: 'Infinity', OPERAND2: 'INFINITY'}), false, '"Infinity" !< "INFINITY"'
    );
    t.equal(
        blocks.lt({OPERAND1: 'INFINITY', OPERAND2: Infinity}), false, '"INFINITY" !< "Infinity"'
    );

    t.equal(
        blocks.lt({OPERAND1: '-INFINITY', OPERAND2: 'INFINITY'}), true, '"-Infinity" < "INFINITY"'
    );
    t.equal(
        blocks.lt({OPERAND1: -Infinity, OPERAND2: 'INFINITY'}), true, '-Infinity < "INFINITY"'
    );


    t.equal(
        blocks.lt({OPERAND1: 'Infinity', OPERAND2: 111}), false, '"Infinity" !< 111'
    );
    t.equal(
        blocks.lt({OPERAND1: 'INFINITY', OPERAND2: 222}), false, '"INFINITY" !< 222'
    );
    t.equal(
        blocks.lt({OPERAND1: Infinity, OPERAND2: 333}), false, 'Infinity !< 333'
    );

    t.equal(
        blocks.lt({OPERAND1: 111, OPERAND2: 'Infinity'}), true, '111 < "Infinity"'
    );
    t.equal(
        blocks.lt({OPERAND1: 222, OPERAND2: 'INFINITY'}), true, '222 < "INFINITY"'
    );
    t.equal(
        blocks.lt({OPERAND1: 333, OPERAND2: Infinity}), true, '333 < Infinity'
    );

    t.end();
});

test('more than: compare string infinity and numeric Infinity', t => {

    t.equal(
        blocks.gt({OPERAND1: 'Infinity', OPERAND2: 'INFINITY'}), false, '"Infinity" !> "INFINITY"'
    );
    t.equal(
        blocks.gt({OPERAND1: 'INFINITY', OPERAND2: Infinity}), false, '"INFINITY" !> "Infinity"'
    );

    t.equal(
        blocks.gt({OPERAND1: 'INFINITY', OPERAND2: '-INFINITY'}), true, '"Infinity" < "-INFINITY"'
    );
    t.equal(
        blocks.gt({OPERAND1: Infinity, OPERAND2: '-INFINITY'}), true, 'Infinity < "-INFINITY"'
    );

    t.equal(
        blocks.gt({OPERAND1: 'Infinity', OPERAND2: 111}), true, '"Infinity" > 111'
    );
    t.equal(
        blocks.gt({OPERAND1: 'INFINITY', OPERAND2: 222}), true, '"INFINITY" > 222'
    );
    t.equal(
        blocks.gt({OPERAND1: Infinity, OPERAND2: 333}), true, 'Infinity > 333'
    );

    t.equal(
        blocks.gt({OPERAND1: 111, OPERAND2: 'Infinity'}), false, '111 !> "Infinity"'
    );
    t.equal(
        blocks.gt({OPERAND1: 222, OPERAND2: 'INFINITY'}), false, '222 !> "INFINITY"'
    );
    t.equal(
        blocks.gt({OPERAND1: 333, OPERAND2: Infinity}), false, '333 !> Infinity'
    );

    t.end();
});
