// Test getResizedWidthHeight function of bitmap adapter class

const test = require('tap').test;
const BitmapAdapter = require('../src/bitmap-adapter');

test('zero', t => {
    const bitmapAdapter = new BitmapAdapter();
    const size = bitmapAdapter.getResizedWidthHeight(0, 0);
    t.equal(0, size.width);
    t.equal(0, size.height);
    t.end();
});

// Double (as if it is bitmap resolution 1)
test('smallImg', t => {
    const bitmapAdapter = new BitmapAdapter();
    const size = bitmapAdapter.getResizedWidthHeight(50, 50);
    t.equal(100, size.width);
    t.equal(100, size.height);
    t.end();
});

// Double (as if it is bitmap resolution 1)
test('stageSizeImage', t => {
    const bitmapAdapter = new BitmapAdapter();
    const size = bitmapAdapter.getResizedWidthHeight(480, 360);
    t.equal(960, size.width);
    t.equal(720, size.height);
    t.end();
});

// Don't resize
test('mediumHeightImage', t => {
    const bitmapAdapter = new BitmapAdapter();
    const size = bitmapAdapter.getResizedWidthHeight(50, 700);
    t.equal(50, size.width);
    t.equal(700, size.height);
    t.end();
});

// Don't resize
test('mediumWidthImage', t => {
    const bitmapAdapter = new BitmapAdapter();
    const size = bitmapAdapter.getResizedWidthHeight(700, 50);
    t.equal(700, size.width);
    t.equal(50, size.height);
    t.end();
});

// Don't resize
test('mediumImage', t => {
    const bitmapAdapter = new BitmapAdapter();
    const size = bitmapAdapter.getResizedWidthHeight(700, 700);
    t.equal(700, size.width);
    t.equal(700, size.height);
    t.end();
});

// Don't resize
test('doubleStageSizeImage', t => {
    const bitmapAdapter = new BitmapAdapter();
    const size = bitmapAdapter.getResizedWidthHeight(960, 720);
    t.equal(960, size.width);
    t.equal(720, size.height);
    t.end();
});

// Fit to stage width
test('wideImage', t => {
    const bitmapAdapter = new BitmapAdapter();
    const size = bitmapAdapter.getResizedWidthHeight(1000, 50);
    t.equal(960, size.width);
    t.equal(960 / 1000 * 50, size.height);
    t.end();
});

// Fit to stage height
test('tallImage', t => {
    const bitmapAdapter = new BitmapAdapter();
    const size = bitmapAdapter.getResizedWidthHeight(50, 1000);
    t.equal(720, size.height);
    t.equal(720 / 1000 * 50, size.width);
    t.end();
});

// Fit to stage height
test('largeImageHeightConstraint', t => {
    const bitmapAdapter = new BitmapAdapter();
    const size = bitmapAdapter.getResizedWidthHeight(1000, 1000);
    t.equal(720, size.height);
    t.equal(720 / 1000 * 1000, size.width);
    t.end();
});

// Fit to stage width
test('largeImageWidthConstraint', t => {
    const bitmapAdapter = new BitmapAdapter();
    const size = bitmapAdapter.getResizedWidthHeight(2000, 1000);
    t.equal(960, size.width);
    t.equal(960 / 2000 * 1000, size.height);
    t.end();
});
