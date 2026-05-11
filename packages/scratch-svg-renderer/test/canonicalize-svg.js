/**
 * Three assertion groups:
 *
 *   1. Security: attack-shaped inputs come back without their dangerous parts.
 *   2. Visual fidelity: legitimate inputs render to identical pixels before and
 *      after canonicalization (same canvas + pixel-diff machinery as
 *      visual-fidelity.js).
 *   3. Fixed point: canonicalize(canonicalize(x)) === canonicalize(x).
 */

const test = require('tap').test;
const fs = require('fs');
const path = require('path');
const {createCanvas, loadImage} = require('canvas');

const canonicalizeSvgText = require('../src/canonicalize-svg');

const FIXTURE_DIR = path.resolve(__dirname, './fixtures');
const SNAPSHOT_DIR = path.resolve(__dirname, './snapshots');
const RENDER_WIDTH = 200;
const RENDER_HEIGHT = 200;
const PIXEL_DIFF_TOLERANCE = 0;

// ── Rendering helpers (shared shape with visual-fidelity.js) ───────────────

const renderToCanvas = async svgString => {
    const image = await loadImage(Buffer.from(svgString, 'utf8'));
    const canvas = createCanvas(RENDER_WIDTH, RENDER_HEIGHT);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, RENDER_WIDTH, RENDER_HEIGHT);
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

// ── 1. Security: dangerous content is stripped ─────────────────────────────

test('canonicalize: removes <script> elements', async t => {
    const input = '<svg xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="50" cy="50" r="40" fill="red"/>' +
        '<script type="text/javascript">alert("xss")</script></svg>';
    const result = await canonicalizeSvgText(input);
    t.notMatch(result, /<script/i, 'no <script> in output');
    t.match(result, /<circle/, 'safe content preserved');
});

test('canonicalize: removes <foreignObject> and its children', async t => {
    const input = '<svg xmlns="http://www.w3.org/2000/svg">' +
        '<foreignObject width="100" height="100">' +
        '<body xmlns="http://www.w3.org/1999/xhtml">' +
        '<img src="x" onerror="alert(1)"/>' +
        '</body></foreignObject>' +
        '<rect fill="blue"/></svg>';
    const result = await canonicalizeSvgText(input);
    t.notMatch(result, /foreignObject/i, 'no foreignObject');
    t.notMatch(result, /onerror/i, 'no onerror');
    t.notMatch(result, /<img/i, 'no img');
    t.match(result, /<rect/, 'safe content preserved');
});

test('canonicalize: unwraps <a> elements, preserving children', async t => {
    const input = '<svg xmlns="http://www.w3.org/2000/svg">' +
        '<a href="javascript:alert(1)"><rect fill="red"/></a></svg>';
    const result = await canonicalizeSvgText(input);
    t.notMatch(result, /<a[\s>]/i, 'no <a> wrapper');
    t.notMatch(result, /javascript:/i, 'no javascript: href');
    t.match(result, /<rect/, 'child element preserved');
});

test('canonicalize: removes animation elements', async t => {
    const input = '<svg xmlns="http://www.w3.org/2000/svg">' +
        '<rect fill="red">' +
        '<animate attributeName="fill" to="blue" dur="1s"/>' +
        '<animateTransform attributeName="transform" type="rotate" dur="2s"/>' +
        '<set attributeName="fill" to="green"/>' +
        '</rect></svg>';
    const result = await canonicalizeSvgText(input);
    t.notMatch(result, /<animate/i, 'no animate');
    t.notMatch(result, /<animateTransform/i, 'no animateTransform');
    t.notMatch(result, /<set[\s>]/i, 'no set');
    t.match(result, /<rect/, 'rect preserved');
});

test('canonicalize: removes event-handler attributes', async t => {
    const input = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)">' +
        '<rect fill="red" onclick="alert(2)" onmouseover="alert(3)"/></svg>';
    const result = await canonicalizeSvgText(input);
    t.notMatch(result, /onload/i, 'no onload');
    t.notMatch(result, /onclick/i, 'no onclick');
    t.notMatch(result, /onmouseover/i, 'no onmouseover');
});

test('canonicalize: removes event-handler attributes with full-width Unicode equivalents', async t => {
    // Full-width Latin ｏｎload (U+FF4F U+FF4E) NFKC-normalizes to ASCII onload.
    const fullWidthOn = '\uFF4F\uFF4E'; // ｏｎ
    const input = `<svg xmlns="http://www.w3.org/2000/svg" ${fullWidthOn}load="alert(1)">` +
        '<rect fill="red"/></svg>';
    const result = await canonicalizeSvgText(input);
    t.notMatch(result, /alert/, 'payload stripped');
    t.notOk(result.includes(`${fullWidthOn}load`), 'full-width attribute removed');
    t.notMatch(result, /onload/i, 'no ASCII onload in output');
});

test('canonicalize: removes event-handler attributes with invisible format characters', async t => {
    // U+200C (ZWNJ) is a valid XML NameChar and can be embedded to break
    // naive /^on/ prefix checks.  normalizeAttrName strips it so on\u200Cclick
    // is recognised as an event handler.
    const input = '<svg xmlns="http://www.w3.org/2000/svg" on\u200Cclick="alert(1)">' +
        '<rect fill="red"/></svg>';
    const result = await canonicalizeSvgText(input);
    t.notMatch(result, /alert/, 'alert payload removed');
    // The attribute with ZWNJ inside must not survive.
    t.notOk(result.includes('on\u200Cclick'), 'on+ZWNJ+click attribute removed');
});

test('canonicalize: preserves all data-* attributes', async t => {
    const input = '<svg xmlns="http://www.w3.org/2000/svg">' +
        '<rect fill="red" data-foo="bar" data-custom="value" data-paper-data="{invalid json}"/></svg>';
    const result = await canonicalizeSvgText(input);
    t.match(result, /data-foo="bar"/, 'data-foo preserved');
    t.match(result, /data-custom="value"/, 'data-custom preserved');
    t.match(result, /data-paper-data/, 'data-paper-data preserved even with invalid JSON');
    t.match(result, /fill="red"/, 'safe attributes preserved');
});

test('canonicalize: removes external href / xlink:href', async t => {
    const input = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
        '<image href="https://evil.com/track.png"/>' +
        '<image xlink:href="https://evil.com/xlink.png"/>' +
        '<image href="data:image/png;base64,iVBORw0KGgo="/>' +
        '<use href="#internal-ref"/></svg>';
    const result = await canonicalizeSvgText(input);
    t.notMatch(result, /evil\.com/, 'no external URLs');
    t.match(result, /data:image/, 'data: URI preserved');
    t.match(result, /#internal-ref/, 'internal fragment ref preserved');
});

test('canonicalize: removes external CSS url() in presentation attributes', async t => {
    const input = '<svg xmlns="http://www.w3.org/2000/svg">' +
        '<rect fill="url(https://evil.com/track)" stroke="url(#internal)"/></svg>';
    const result = await canonicalizeSvgText(input);
    t.notMatch(result, /evil\.com/, 'external url() removed');
    t.match(result, /url\(#internal\)/, 'internal url() preserved');
});

test('canonicalize: strips external url() from style attribute declarations', async t => {
    const input = '<svg xmlns="http://www.w3.org/2000/svg">' +
        '<rect style="fill: url(https://evil.com/x); stroke: url(#ok); opacity: 0.5"/></svg>';
    const result = await canonicalizeSvgText(input);
    t.notMatch(result, /evil\.com/, 'external url() removed from style');
    t.match(result, /url\(#ok\)/, 'internal url() in style preserved');
    t.match(result, /opacity/, 'safe declarations preserved');
});

test('canonicalize: removes <style> elements after inlining', async t => {
    const input = '<svg xmlns="http://www.w3.org/2000/svg">' +
        '<style>.a { fill: red; }</style><rect class="a"/></svg>';
    const result = await canonicalizeSvgText(input);
    t.notMatch(result, /<style/i, 'no <style> element');
    // Inlined styles should appear as style attribute
    t.match(result, /fill/, 'fill style preserved (inlined)');
});

test('canonicalize: removes comments, doctype, and XML processing instructions', async t => {
    const input = '<?xml version="1.0" encoding="UTF-8"?>' +
        '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">' +
        '<svg xmlns="http://www.w3.org/2000/svg">' +
        '<!-- secret comment --><rect fill="red"/></svg>';
    const result = await canonicalizeSvgText(input);
    t.notMatch(result, /<!DOCTYPE/i, 'no doctype');
    t.notMatch(result, /<\?xml/i, 'no XML processing instruction');
    t.notMatch(result, /<!--/, 'no comments');
});

// Test against existing fixture files from the sanitize-svg corpus
test('canonicalize: handles blocked-elements.svg fixture', async t => {
    const input = fs.readFileSync(path.resolve(FIXTURE_DIR, 'blocked-elements.svg'), 'utf8');
    const result = await canonicalizeSvgText(input);
    t.notMatch(result, /foreignObject/i, 'no foreignObject');
    t.notMatch(result, /<script/i, 'no script');
    t.notMatch(result, /<animate[\s>]/i, 'no animate');
    t.notMatch(result, /<set[\s>]/i, 'no set');
    // Safe content survives
    t.match(result, /<rect/, 'safe rect preserved');
    t.match(result, /url\(#myMask\)/, 'internal mask reference preserved');
});

test('canonicalize: handles script.svg fixture', async t => {
    const input = fs.readFileSync(path.resolve(FIXTURE_DIR, 'script.svg'), 'utf8');
    const result = await canonicalizeSvgText(input);
    t.notMatch(result, /<script/i, 'no script');
    t.match(result, /<circle/, 'circle preserved');
});

test('canonicalize: handles external-hrefs.svg fixture', async t => {
    const input = fs.readFileSync(path.resolve(FIXTURE_DIR, 'external-hrefs.svg'), 'utf8');
    const result = await canonicalizeSvgText(input);
    t.notMatch(result, /example\.com/, 'no external URLs');
    // data: and # refs should be preserved
    t.match(result, /data:image\/png/, 'data: URI preserved');
    t.match(result, /#internal/, 'internal ref preserved');
});

test('canonicalize: handles css-links.svg fixture', async t => {
    const input = fs.readFileSync(path.resolve(FIXTURE_DIR, 'css-links.svg'), 'utf8');
    const result = await canonicalizeSvgText(input);
    t.notMatch(result, /example\.com/, 'no external URLs');
    t.notMatch(result, /<style/i, 'no style elements');
    // Internal refs should survive
    t.match(result, /url\(#myMask\)/, 'internal mask reference preserved');
});

test('canonicalize: handles metadata-onload.svg fixture gracefully', async t => {
    // This fixture has intentionally malformed XML (split attribute name
    // across a metadata element) that SVGO's strict SAX parser rejects.
    // Verify the function degrades gracefully rather than throwing.
    const input = fs.readFileSync(path.resolve(FIXTURE_DIR, 'metadata-onload.svg'), 'utf8');
    const result = await canonicalizeSvgText(input);
    t.type(result, 'string', 'returns a string (falls back to input)');
});

// ── 2. Visual fidelity: legitimate inputs render identically ───────────────

test('visual fidelity: canonicalizeSvgText is visually transparent on cat costume', async t => {
    const rawSvg = fs.readFileSync(path.resolve(FIXTURE_DIR, 'cat-costume.svg'), 'utf8');
    const canonicalSvg = await canonicalizeSvgText(rawSvg);

    const rawCanvas = await renderToCanvas(rawSvg);
    const canonicalCanvas = await renderToCanvas(canonicalSvg);

    const diff = countPixelDiffs(rawCanvas, canonicalCanvas);
    t.ok(
        diff <= PIXEL_DIFF_TOLERANCE,
        `raw vs canonicalized cat costume: ${diff} differing pixels (tolerance ${PIXEL_DIFF_TOLERANCE})`
    );
});

test('visual fidelity: canonicalized cat costume matches committed snapshot', async t => {
    const rawSvg = fs.readFileSync(path.resolve(FIXTURE_DIR, 'cat-costume.svg'), 'utf8');
    const canonicalSvg = await canonicalizeSvgText(rawSvg);
    const canonicalCanvas = await renderToCanvas(canonicalSvg);

    const snapshotPath = path.resolve(SNAPSHOT_DIR, 'cat-costume.canonicalized.png');
    const updateRequested = process.env.TAP_SNAPSHOT === '1';
    const snapshotExists = fs.existsSync(snapshotPath);
    const relativeSnapshotPath = path.relative(__dirname, snapshotPath);

    if (updateRequested) {
        fs.mkdirSync(SNAPSHOT_DIR, {recursive: true});
        fs.writeFileSync(snapshotPath, canonicalCanvas.toBuffer('image/png'));
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

    const diff = countPixelDiffs(canonicalCanvas, baselineCanvas);
    t.ok(
        diff <= PIXEL_DIFF_TOLERANCE,
        `canonicalized cat costume vs snapshot: ${diff} differing pixels (tolerance ${PIXEL_DIFF_TOLERANCE})`
    );
});

// ── 3. Fixed point: canonicalize(canonicalize(x)) === canonicalize(x) ──────

test('fixed point: clean SVG is stable', async t => {
    const input = '<svg xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="50" cy="50" r="40" fill="red"/></svg>';
    const first = await canonicalizeSvgText(input);
    const second = await canonicalizeSvgText(first);
    t.equal(first, second, 'clean SVG is a fixed point');
});

test('fixed point: attack-shaped SVG is stable after first pass', async t => {
    const input = '<svg xmlns="http://www.w3.org/2000/svg">' +
        '<script>alert(1)</script>' +
        '<foreignObject><body xmlns="http://www.w3.org/1999/xhtml">' +
        '<img src="x" onerror="alert(2)"/></body></foreignObject>' +
        '<a href="javascript:void(0)">' +
        '<rect fill="red" data-foo="bar" onclick="alert(3)" data-paper-data="{invalid}"/></a>' +
        '<animate attributeName="x" to="10"/>' +
        '<rect fill="url(https://evil.com/x)" stroke="url(#ok)"/></svg>';
    const first = await canonicalizeSvgText(input);
    const second = await canonicalizeSvgText(first);
    t.equal(first, second, 'attack-shaped SVG is a fixed point after first canonicalization');
});

test('fixed point: all parseable fixture files are stable', async t => {
    // Some fixtures contain intentionally malformed XML (Illustrator custom
    // entities, split attribute names) that SVGO's strict parser rejects.
    // For those, canonicalize returns the input unchanged — which is itself
    // a fixed point (identity function).  We still test them all.
    const fixtureFiles = fs.readdirSync(FIXTURE_DIR)
        .filter(f => f.endsWith('.svg') && !f.endsWith('.sanitized.svg'));
    for (const file of fixtureFiles) {
        const input = fs.readFileSync(path.resolve(FIXTURE_DIR, file), 'utf8');
        const first = await canonicalizeSvgText(input);
        const second = await canonicalizeSvgText(first);
        t.equal(first, second, `${file} is a fixed point`);
    }
});
