const tap = require('tap');
const test = tap.test;

// Mock `window` and `document.createElement` for twgl.js.
global.window = {};
global.document = {
    createElement: () => ({getContext: () => {}})
};

// Minimal `ImageData` so that `Silhouette.update` takes its ImageData branch instead of drawing to a canvas.
class ImageData {
    constructor (data, width, height) {
        this.data = data;
        this.width = width;
        this.height = height;
    }
}
global.ImageData = ImageData;

const Drawable = require('../../src/Drawable');
const MockSkin = require('../fixtures/MockSkin');
// Stub the two modules that cannot load under Node: the scratch-svg-renderer bundle needs a real DOM (DOMPurify),
// and text-wrapper requires a webpack loader. The convex hull code uses neither.
const RenderWebGL = tap.mockRequire('../../src/RenderWebGL', {
    '@scratch/scratch-svg-renderer': {},
    '../../src/util/text-wrapper': class {}
});

/**
 * Build a drawable whose skin has the given nominal size and a silhouette of the given texel size.
 * The drawable keeps its default transform (position 0, 0; scale 100; direction 90), so its bounds are in skin units.
 * @param {Array<number>} size The skin's nominal size, in skin units.
 * @param {number} texelWidth The silhouette's width, in texels.
 * @param {number} texelHeight The silhouette's height, in texels.
 * @param {function(number, number): boolean} isOpaque Whether the texel at (x, y) is opaque.
 * @returns {Drawable} A drawable ready for `_getConvexHullPointsForDrawable`.
 */
const makeDrawable = function (size, texelWidth, texelHeight, isOpaque) {
    const data = new Uint8ClampedArray(texelWidth * texelHeight * 4);
    for (let y = 0; y < texelHeight; y++) {
        for (let x = 0; x < texelWidth; x++) {
            if (isOpaque(x, y)) {
                data[(((y * texelWidth) + x) * 4) + 3] = 255;
            }
        }
    }

    const drawable = new Drawable();
    drawable.skin = new MockSkin();
    drawable.skin.size = size;
    drawable.skin._silhouette.update(new ImageData(data, texelWidth, texelHeight));
    return drawable;
};

/**
 * Compute the convex hull points of a drawable through the real renderer method.
 * @param {Drawable} drawable The drawable to compute the hull for.
 * @returns {Array<Array<number>>} The hull points, as [[x, y], ...] in skin units.
 */
const getHull = function (drawable) {
    const fakeRenderer = {_allDrawables: [drawable]};
    return RenderWebGL.prototype._getConvexHullPointsForDrawable.call(fakeRenderer, 0);
};

/**
 * Returns the distinct points of a hull as sorted "x,y" strings, so hulls can be compared as sets.
 * @param {Array<Array<number>>} points The hull points.
 * @returns {Array<string>} The distinct points, sorted.
 */
const toPointSet = function (points) {
    return Array.from(new Set(points.map(([x, y]) => `${x},${y}`))).sort();
};

/**
 * Give a drawable its convex hull points and return its bounds' size, rounded to 3 decimals.
 * @param {Drawable} drawable The drawable, with its default transform.
 * @param {Array<Array<number>>} points The drawable's convex hull points.
 * @returns {{width: number, height: number}} The bounds' width and height, in skin units.
 */
const getBounds = function (drawable, points) {
    drawable.setConvexHullPoints(points);
    const bounds = drawable.getFastBounds();
    return {
        width: Number((bounds.right - bounds.left).toFixed(3)),
        height: Number((bounds.top - bounds.bottom).toFixed(3))
    };
};

/**
 * Returns the smallest and largest x of a set of hull points.
 * @param {Array<Array<number>>} points The hull points.
 * @returns {Array<number>} [min x, max x].
 */
const xRange = function (points) {
    const xs = points.map(([x]) => x);
    return [Math.min(...xs), Math.max(...xs)];
};

test('resolution 2: rightmost texel column only', t => {
    const drawable = makeDrawable([3, 3], 6, 6, x => x === 5);
    const points = getHull(drawable);

    t.same(toPointSet(points), toPointSet([[2, 0], [3, 0], [3, 3], [2, 3]]), 'hull is the last unit column');
    t.same(getBounds(drawable, points), {width: 1, height: 3}, 'bounds are 1 by 3');

    t.end();
});

test('resolution 2: bottom texel row only', t => {
    const drawable = makeDrawable([3, 3], 6, 6, (x, y) => y === 5);
    const points = getHull(drawable);

    t.same(toPointSet(points), toPointSet([[0, 2], [3, 2], [3, 3], [0, 3]]), 'hull is the last unit row');
    t.same(getBounds(drawable, points), {width: 3, height: 1}, 'bounds are 3 by 1');

    t.end();
});

test('resolution 2: single texel at the far corner', t => {
    const drawable = makeDrawable([3, 3], 6, 6, (x, y) => x === 5 && y === 5);
    const points = getHull(drawable);

    t.same(toPointSet(points), toPointSet([[2, 2], [3, 2], [3, 3], [2, 3]]), 'hull is the far corner unit');
    t.same(getBounds(drawable, points), {width: 1, height: 1}, 'bounds are 1 by 1');

    t.end();
});

test('resolution 2: fully opaque', t => {
    const drawable = makeDrawable([3, 3], 6, 6, () => true);
    const points = getHull(drawable);

    t.same(toPointSet(points), toPointSet([[0, 0], [3, 0], [3, 3], [0, 3]]), 'hull is the whole skin');
    t.same(getBounds(drawable, points), {width: 3, height: 3}, 'bounds are 3 by 3');

    t.end();
});

test('resolution 1: fully opaque', t => {
    const drawable = makeDrawable([4, 4], 4, 4, () => true);
    const points = getHull(drawable);

    t.same(toPointSet(points), toPointSet([[0, 0], [4, 0], [4, 4], [0, 4]]), 'hull is the whole skin');
    t.same(getBounds(drawable, points), {width: 4, height: 4}, 'bounds are 4 by 4');

    t.end();
});

test('resolution 1: rightmost texel column only', t => {
    const drawable = makeDrawable([4, 4], 4, 4, x => x === 3);
    const points = getHull(drawable);

    t.same(xRange(points), [3, 4], 'hull spans the last unit column');
    t.same(getBounds(drawable, points), {width: 1, height: 4}, 'bounds are 1 by 4');

    t.end();
});

test('resolution 1: interior texel column 2 only', t => {
    const drawable = makeDrawable([4, 4], 4, 4, x => x === 2);
    const points = getHull(drawable);

    // At resolution 1, isTouchingLinear tests the sampled texel and its +1 neighbours. A unit-centre sample lands on
    // texel x in the left half (testing x and x + 1) and on texel x - 1 in the right half (testing x - 1 and x), so
    // units 1, 2 and 3 all touch texel column 2. The hull is three units wide where the opaque texels are one.
    t.same(xRange(points), [1, 4], 'hull spans units 1 to 3, including the isTouchingLinear bleed');
    t.same(getBounds(drawable, points), {width: 3, height: 4}, 'bounds are 3 by 4');

    t.end();
});

test('resolution 2: opaque texel columns 3 and 4 only', t => {
    const drawable = makeDrawable([3, 3], 6, 6, x => x === 3 || x === 4);
    const points = getHull(drawable);

    t.same(xRange(points), [1, 3], 'hull spans units 1 and 2');
    t.same(getBounds(drawable, points), {width: 2, height: 3}, 'bounds are 2 by 3');

    t.end();
});
