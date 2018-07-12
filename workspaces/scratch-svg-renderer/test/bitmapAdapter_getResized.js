// Test getResizedWidthHeight function of bitmap adapter class

const test = require('tap').test;
const BitmapAdapter = require('../src/bitmap-adapter');

test('zero', t => {
    const bitmapAdapter = new BitmapAdapter();
    const size = bitmapAdapter.getResizedWidthHeight(0, 0);
    t.equals(0, size.width);
    t.equals(0, size.height);
    t.end();
});

// Double (as if it is bitmap resolution 1)
test('smallImg', t => {
    const bitmapAdapter = new BitmapAdapter();
    const size = bitmapAdapter.getResizedWidthHeight(50, 50);
    t.equals(100, size.width);
    t.equals(100, size.height);
    t.end();
});

// Double (as if it is bitmap resolution 1)
test('stageSizeImage', t => {
    const bitmapAdapter = new BitmapAdapter();
    const size = bitmapAdapter.getResizedWidthHeight(480, 360);
    t.equals(960, size.width);
    t.equals(720, size.height);
    t.end();
});

// Don't resize
test('mediumHeightImage', t => {
    const bitmapAdapter = new BitmapAdapter();
    const size = bitmapAdapter.getResizedWidthHeight(50, 700);
    t.equals(50, size.width);
    t.equals(700, size.height);
    t.end();
});

// Don't resize
test('mediumWidthImage', t => {
    const bitmapAdapter = new BitmapAdapter();
    const size = bitmapAdapter.getResizedWidthHeight(700, 50);
    t.equals(700, size.width);
    t.equals(50, size.height);
    t.end();
});

// Don't resize
test('mediumImage', t => {
    const bitmapAdapter = new BitmapAdapter();
    const size = bitmapAdapter.getResizedWidthHeight(700, 700);
    t.equals(700, size.width);
    t.equals(700, size.height);
    t.end();
});

// Don't resize
test('doubleStageSizeImage', t => {
    const bitmapAdapter = new BitmapAdapter();
    const size = bitmapAdapter.getResizedWidthHeight(960, 720);
    t.equals(960, size.width);
    t.equals(720, size.height);
    t.end();
});

// Fit to stage width
test('wideImage', t => {
    const bitmapAdapter = new BitmapAdapter();
    const size = bitmapAdapter.getResizedWidthHeight(1000, 50);
    t.equals(960, size.width);
    t.equals(960 / 1000 * 50, size.height);
    t.end();
});

// Fit to stage height
test('tallImage', t => {
    const bitmapAdapter = new BitmapAdapter();
    const size = bitmapAdapter.getResizedWidthHeight(50, 1000);
    t.equals(720, size.height);
    t.equals(720 / 1000 * 50, size.width);
    t.end();
});

// Fit to stage height
test('largeImageHeightConstraint', t => {
    const bitmapAdapter = new BitmapAdapter();
    const size = bitmapAdapter.getResizedWidthHeight(1000, 1000);
    t.equals(720, size.height);
    t.equals(720 / 1000 * 1000, size.width);
    t.end();
});

// Fit to stage width
test('largeImageWidthConstraint', t => {
    const bitmapAdapter = new BitmapAdapter();
    const size = bitmapAdapter.getResizedWidthHeight(2000, 1000);
    t.equals(960, size.width);
    t.equals(960 / 2000 * 1000, size.height);
    t.end();
});
