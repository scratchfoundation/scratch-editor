/**
 * Phase 0 task 1b — visual fidelity test for sanitize/canonicalize transparency.
 *
 * Asserts that running an SVG through `sanitizeSvgText` produces a string that
 * renders to the same pixels as the input. Two checks:
 *
 *   1. Cross-comparison: render the raw SVG and the sanitized SVG, byte-diff
 *      the resulting ImageData. Catches sanitize transformations that change
 *      visuals (today and going forward).
 *
 *   2. Snapshot: render the sanitized SVG and compare to a committed PNG
 *      baseline. Catches future regressions in scratch-svg-renderer, font
 *      assets, or rendering-pipeline drift, even when sanitize itself
 *      hasn't changed. The snapshot is only written or updated when
 *      `TAP_SNAPSHOT=1` is set in the environment; a missing snapshot
 *      is otherwise a test failure so a deleted baseline can't pass CI.
 *
 * When `canonicalizeSvgText` lands (sandbox-svg plan, Phase 1 task 3),
 * extend this to also assert visual transparency for that function.
 */

const test = require('tap').test;
const fs = require('fs');
const path = require('path');
const {createCanvas, loadImage} = require('canvas');

const sanitizeSvg = require('../src/sanitize-svg');

const FIXTURE_DIR = path.resolve(__dirname, './fixtures');
const SNAPSHOT_DIR = path.resolve(__dirname, './snapshots');
const RENDER_WIDTH = 200;
const RENDER_HEIGHT = 200;
// Allow a tiny number of differing pixels to absorb antialiasing edge cases
// when DOMPurify reorders attributes. Set to zero if the test is stable enough.
const PIXEL_DIFF_TOLERANCE = 0;

const renderToCanvas = async svgString => {
    // node-canvas's loadImage doesn't accept SVG via data URIs; pass a Buffer
    // of the SVG bytes instead (canvas decodes via librsvg).
    const image = await loadImage(Buffer.from(svgString, 'utf8'));
    const canvas = createCanvas(RENDER_WIDTH, RENDER_HEIGHT);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, RENDER_WIDTH, RENDER_HEIGHT);
    // Fit-to-bounds scaling so the comparison sees the same pixels regardless
    // of the SVG's intrinsic size.
    const scale = Math.min(RENDER_WIDTH / image.width, RENDER_HEIGHT / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const dx = (RENDER_WIDTH - drawWidth) / 2;
    const dy = (RENDER_HEIGHT - drawHeight) / 2;
    ctx.drawImage(image, dx, dy, drawWidth, drawHeight);
    return canvas;
};

const countPixelDiffs = (canvasA, canvasB) => {
    const a = canvasA.getContext('2d').getImageData(0, 0, RENDER_WIDTH, RENDER_HEIGHT).data;
    const b = canvasB.getContext('2d').getImageData(0, 0, RENDER_WIDTH, RENDER_HEIGHT).data;
    if (a.length !== b.length) {
        throw new Error(`ImageData length mismatch: ${a.length} vs ${b.length}`);
    }
    let diff = 0;
    for (let i = 0; i < a.length; i += 4) {
        if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) {
            diff++;
        }
    }
    return diff;
};

test('visual fidelity: sanitizeSvgText is visually transparent on cat costume', async t => {
    const rawSvg = fs.readFileSync(path.resolve(FIXTURE_DIR, 'cat-costume.svg'), 'utf8');
    const sanitizedSvg = sanitizeSvg.sanitizeSvgText(rawSvg);

    const rawCanvas = await renderToCanvas(rawSvg);
    const sanitizedCanvas = await renderToCanvas(sanitizedSvg);

    const diff = countPixelDiffs(rawCanvas, sanitizedCanvas);
    t.ok(
        diff <= PIXEL_DIFF_TOLERANCE,
        `raw vs sanitized: ${diff} differing pixels (tolerance ${PIXEL_DIFF_TOLERANCE})`
    );
});

test('visual fidelity: sanitized cat costume matches committed snapshot', async t => {
    const rawSvg = fs.readFileSync(path.resolve(FIXTURE_DIR, 'cat-costume.svg'), 'utf8');
    const sanitizedSvg = sanitizeSvg.sanitizeSvgText(rawSvg);
    const sanitizedCanvas = await renderToCanvas(sanitizedSvg);

    const snapshotPath = path.resolve(SNAPSHOT_DIR, 'cat-costume.sanitized.png');
    const updateRequested = process.env.TAP_SNAPSHOT === '1';
    const snapshotExists = fs.existsSync(snapshotPath);
    const relativeSnapshotPath = path.relative(__dirname, snapshotPath);

    if (updateRequested) {
        fs.mkdirSync(SNAPSHOT_DIR, {recursive: true});
        fs.writeFileSync(snapshotPath, sanitizedCanvas.toBuffer('image/png'));
        t.pass(`snapshot ${snapshotExists ? 'updated' : 'created'} at ${relativeSnapshotPath}`);
        return;
    }

    if (!snapshotExists) {
        t.fail(
            `missing snapshot at ${relativeSnapshotPath}. ` +
            `Run with TAP_SNAPSHOT=1 to create it (and commit the result).`
        );
        return;
    }

    const baseline = await loadImage(snapshotPath);
    const baselineCanvas = createCanvas(RENDER_WIDTH, RENDER_HEIGHT);
    baselineCanvas.getContext('2d').drawImage(baseline, 0, 0);

    const diff = countPixelDiffs(sanitizedCanvas, baselineCanvas);
    t.ok(
        diff <= PIXEL_DIFF_TOLERANCE,
        `sanitized cat costume vs snapshot: ${diff} differing pixels (tolerance ${PIXEL_DIFF_TOLERANCE})`
    );
});
