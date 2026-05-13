const {test, expect} = require('@playwright/test');

/**
 * Integration tests for loadSvgString — the full async pipeline from raw SVG
 * string through sanitization, normalization, and (when needed) sandboxed
 * iframe measurement via transformMeasurements.
 */

// --- Test fixtures ---

// SVG with viewBox + width + height: takes the sync fast-path (no measurement).
const SVG_WITH_VIEWBOX = '<svg xmlns="http://www.w3.org/2000/svg" ' +
    'viewBox="0 0 100 80" width="100" height="80">' +
    '<rect x="10" y="10" width="50" height="30" fill="blue"/>' +
    '</svg>';

// SVG with viewBox but no width/height: sets them from viewBox.baseVal (no measurement).
const SVG_VIEWBOX_NO_DIMS = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150">' +
    '<circle cx="100" cy="75" r="50" fill="green"/>' +
    '</svg>';

// SVG without viewBox: triggers transformMeasurements (async iframe path).
const SVG_NO_VIEWBOX = '<svg xmlns="http://www.w3.org/2000/svg">' +
    '<rect x="5" y="10" width="60" height="40" fill="red"/>' +
    '</svg>';

// SVG without viewBox and with a stroke: tests stroke-width enlargement.
const SVG_NO_VIEWBOX_WITH_STROKE = '<svg xmlns="http://www.w3.org/2000/svg">' +
    '<rect x="10" y="20" width="80" height="50" fill="none" stroke="black" stroke-width="4"/>' +
    '</svg>';

// SVG with negative bbox coordinates (like some Scratch 2 costumes).
const SVG_NEGATIVE_COORDS = '<svg xmlns="http://www.w3.org/2000/svg">' +
    '<circle cx="-20" cy="-10" r="30" fill="purple"/>' +
    '</svg>';

// Scratch 2-style SVG: no viewBox, has text elements that need quirks transforms.
const SVG_V2_WITH_TEXT = '<svg xmlns="http://www.w3.org/2000/svg">' +
    '<text x="10" y="20" font-family="Helvetica" font-size="14">Hello World</text>' +
    '</svg>';

// SVG with a linear gradient missing x2 (Scratch 2 quirk).
const SVG_V2_GRADIENT = '<svg xmlns="http://www.w3.org/2000/svg">' +
    '<defs><linearGradient id="g1"><stop offset="0" stop-color="red"/>' +
    '<stop offset="1" stop-color="blue"/></linearGradient></defs>' +
    '<rect x="0" y="0" width="100" height="100" fill="url(#g1)"/>' +
    '</svg>';

// Malformed SVG that should cause an error.
const SVG_MALFORMED = '<not-svg>this is not valid</not-svg>';

// SVG with text using a Scratch font family.
const SVG_WITH_SCRATCH_FONT = '<svg xmlns="http://www.w3.org/2000/svg">' +
    '<text x="0" y="20" font-family="Sans Serif" font-size="18">Test text</text>' +
    '</svg>';

// A large SVG with many elements (for performance testing).
const generateLargeSvg = (elementCount) => {
    let rects = '';
    for (let i = 0; i < elementCount; i++) {
        rects += `<rect x="${i % 100}" y="${Math.floor(i / 100)}" width="1" height="1" fill="red"/>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;
};

test.beforeEach(async ({page}) => {
    await page.goto('load-svg-string-harness.html');
    await page.waitForFunction(
        () => typeof window.loadSvgString === 'function'
    );
});

test('SVG with viewBox and dimensions resolves with correct attributes', async ({page}) => {
    const result = await page.evaluate(async (svg) => {
        const svgTag = await window.loadSvgString(svg);
        return {
            width: svgTag.getAttribute('width'),
            height: svgTag.getAttribute('height'),
            viewBox: svgTag.getAttribute('viewBox'),
            tagName: svgTag.tagName
        };
    }, SVG_WITH_VIEWBOX);

    expect(result.tagName).toBe('svg');
    expect(result.width).toBe('100');
    expect(result.height).toBe('80');
    expect(result.viewBox).toBe('0 0 100 80');
});

test('SVG with viewBox but no dimensions gets width/height from viewBox', async ({page}) => {
    const result = await page.evaluate(async (svg) => {
        const svgTag = await window.loadSvgString(svg);
        return {
            width: svgTag.getAttribute('width'),
            height: svgTag.getAttribute('height'),
            viewBox: svgTag.getAttribute('viewBox')
        };
    }, SVG_VIEWBOX_NO_DIMS);

    expect(result.width).toBe('200');
    expect(result.height).toBe('150');
    expect(result.viewBox).toBe('0 0 200 150');
});

test('SVG without viewBox gets viewBox/width/height from iframe measurement', async ({page}) => {
    const result = await page.evaluate(async (svg) => {
        const svgTag = await window.loadSvgString(svg);
        return {
            width: Number(svgTag.getAttribute('width')),
            height: Number(svgTag.getAttribute('height')),
            viewBox: svgTag.getAttribute('viewBox')
        };
    }, SVG_NO_VIEWBOX);

    // The rect is at (5, 10) with size (60, 40), bbox = (5, 10, 60, 40).
    // transformStrokeWidths adds default stroke-width=1 to graphics elements,
    // so findLargestStrokeWidth returns 1, halfStrokeWidth = 0.5, enlarging by 1.
    expect(result.width).toBeCloseTo(61, 0);
    expect(result.height).toBeCloseTo(41, 0);
    expect(result.viewBox).toBeDefined();
    // viewBox origin shifts by -halfStrokeWidth
    const vb = result.viewBox.split(' ').map(Number);
    expect(vb[0]).toBeCloseTo(4.5, 0);
    expect(vb[1]).toBeCloseTo(9.5, 0);
    expect(vb[2]).toBeCloseTo(61, 0);
    expect(vb[3]).toBeCloseTo(41, 0);
});

test('SVG without viewBox applies stroke-width enlargement to measured bbox', async ({page}) => {
    const result = await page.evaluate(async (svg) => {
        const svgTag = await window.loadSvgString(svg);
        return {
            width: Number(svgTag.getAttribute('width')),
            height: Number(svgTag.getAttribute('height')),
            viewBox: svgTag.getAttribute('viewBox')
        };
    }, SVG_NO_VIEWBOX_WITH_STROKE);

    // Rect at (10, 20), size (80, 50), stroke-width 4 → half = 2
    // Expected: viewBox = (8, 18, 84, 54), width = 84, height = 54
    expect(result.width).toBeCloseTo(84, 0);
    expect(result.height).toBeCloseTo(54, 0);
    const vb = result.viewBox.split(' ').map(Number);
    expect(vb[0]).toBeCloseTo(8, 0);
    expect(vb[1]).toBeCloseTo(18, 0);
    expect(vb[2]).toBeCloseTo(84, 0);
    expect(vb[3]).toBeCloseTo(54, 0);
});

test('SVG with negative bbox coordinates measured correctly', async ({page}) => {
    const result = await page.evaluate(async (svg) => {
        const svgTag = await window.loadSvgString(svg);
        return {
            width: Number(svgTag.getAttribute('width')),
            height: Number(svgTag.getAttribute('height')),
            viewBox: svgTag.getAttribute('viewBox')
        };
    }, SVG_NEGATIVE_COORDS);

    // Circle at (-20, -10), r=30 → bbox = (-50, -40, 60, 60).
    // Default stroke-width=1 enlargement: +1 on each dimension.
    expect(result.width).toBeCloseTo(61, 0);
    expect(result.height).toBeCloseTo(61, 0);
    const vb = result.viewBox.split(' ').map(Number);
    expect(vb[0]).toBeCloseTo(-50.5, 0);
    expect(vb[1]).toBeCloseTo(-40.5, 0);
});

test('v2 SVG applies text transforms and measures correctly', async ({page}) => {
    const result = await page.evaluate(async (svg) => {
        const svgTag = await window.loadSvgString(svg, true /* fromVersion2 */);
        // Check that text transforms were applied
        const textEl = svgTag.querySelector('text');
        const hasAlignmentBaseline = textEl ?
            textEl.getAttribute('alignment-baseline') === 'text-before-edge' : false;
        return {
            hasViewBox: svgTag.hasAttribute('viewBox'),
            hasWidth: svgTag.hasAttribute('width'),
            hasHeight: svgTag.hasAttribute('height'),
            hasAlignmentBaseline,
            width: Number(svgTag.getAttribute('width')),
            height: Number(svgTag.getAttribute('height'))
        };
    }, SVG_V2_WITH_TEXT);

    expect(result.hasViewBox).toBe(true);
    expect(result.hasWidth).toBe(true);
    expect(result.hasHeight).toBe(true);
    expect(result.hasAlignmentBaseline).toBe(true);
    // Dimensions should be non-zero (measured from iframe)
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
});

test('v2 SVG applies gradient x2 fixup', async ({page}) => {
    const result = await page.evaluate(async (svg) => {
        const svgTag = await window.loadSvgString(svg, true /* fromVersion2 */);
        const gradient = svgTag.querySelector('linearGradient');
        return {
            x2: gradient ? gradient.getAttribute('x2') : null,
            hasViewBox: svgTag.hasAttribute('viewBox')
        };
    }, SVG_V2_GRADIENT);

    // Scratch 2 quirk: missing x2 should be set to '0'
    expect(result.x2).toBe('0');
    expect(result.hasViewBox).toBe(true);
});

test('malformed SVG rejects with an error', async ({page}) => {
    const error = await page.evaluate(async (svg) => {
        try {
            await window.loadSvgString(svg);
            return null;
        } catch (e) {
            return {message: e.message};
        }
    }, SVG_MALFORMED);

    expect(error).not.toBeNull();
    expect(error.message).toContain('does not appear to be SVG');
});

test('multiple loadSvgString calls share a single measurement iframe', async ({page}) => {
    const result = await page.evaluate(async () => {
        // Two SVGs without viewBox — both trigger measurement.
        const svg1 = '<svg xmlns="http://www.w3.org/2000/svg">' +
            '<rect x="0" y="0" width="30" height="20" fill="red"/></svg>';
        const svg2 = '<svg xmlns="http://www.w3.org/2000/svg">' +
            '<rect x="0" y="0" width="50" height="40" fill="blue"/></svg>';

        await window.loadSvgString(svg1);
        await window.loadSvgString(svg2);

        // Count iframes in the document — the singleton sandbox
        // should create only one.
        const iframeCount = document.querySelectorAll('iframe').length;
        return {iframeCount};
    });

    expect(result.iframeCount).toBe(1);
});

test('concurrent loadSvgString calls resolve with correct results', async ({page}) => {
    const results = await page.evaluate(async () => {
        const svg1 = '<svg xmlns="http://www.w3.org/2000/svg">' +
            '<rect x="0" y="0" width="30" height="20" fill="red"/></svg>';
        const svg2 = '<svg xmlns="http://www.w3.org/2000/svg">' +
            '<rect x="0" y="0" width="70" height="55" fill="blue"/></svg>';
        const svg3 = '<svg xmlns="http://www.w3.org/2000/svg">' +
            '<rect x="5" y="5" width="100" height="80" fill="green"/></svg>';

        // Fire all three concurrently
        const [tag1, tag2, tag3] = await Promise.all([
            window.loadSvgString(svg1),
            window.loadSvgString(svg2),
            window.loadSvgString(svg3)
        ]);

        return {
            w1: Number(tag1.getAttribute('width')),
            h1: Number(tag1.getAttribute('height')),
            w2: Number(tag2.getAttribute('width')),
            h2: Number(tag2.getAttribute('height')),
            w3: Number(tag3.getAttribute('width')),
            h3: Number(tag3.getAttribute('height'))
        };
    });

    // Each SVG gets +1 from default stroke-width enlargement.
    expect(results.w1).toBeCloseTo(31, 0);
    expect(results.h1).toBeCloseTo(21, 0);
    expect(results.w2).toBeCloseTo(71, 0);
    expect(results.h2).toBeCloseTo(56, 0);
    expect(results.w3).toBeCloseTo(101, 0);
    expect(results.h3).toBeCloseTo(81, 0);
});

test('first loadSvgString call succeeds (iframe created on demand)', async ({page}) => {
    // This test verifies that the very first call — when no iframe exists
    // yet — waits for iframe load and then resolves correctly.
    const result = await page.evaluate(async () => {
        const svg = '<svg xmlns="http://www.w3.org/2000/svg">' +
            '<rect x="0" y="0" width="42" height="33" fill="red"/></svg>';

        // Ensure no iframes exist before the call.
        const before = document.querySelectorAll('iframe').length;
        const svgTag = await window.loadSvgString(svg);
        const after = document.querySelectorAll('iframe').length;

        return {
            beforeIframes: before,
            afterIframes: after,
            width: Number(svgTag.getAttribute('width')),
            height: Number(svgTag.getAttribute('height'))
        };
    });

    expect(result.beforeIframes).toBe(0);
    expect(result.afterIframes).toBe(1);
    // +1 from default stroke-width enlargement
    expect(result.width).toBeCloseTo(43, 0);
    expect(result.height).toBeCloseTo(34, 0);
});

test('large SVG with many elements does not time out', async ({page}) => {
    // The generated SVG has no viewBox, so it triggers the full sandbox
    // measurement path (transformMeasurements via the iframe).
    const largeSvg = generateLargeSvg(5000);

    const result = await page.evaluate(async (svg) => {
        const start = performance.now();
        const svgTag = await window.loadSvgString(svg);
        const elapsed = performance.now() - start;
        return {
            hasViewBox: svgTag.hasAttribute('viewBox'),
            width: Number(svgTag.getAttribute('width')),
            height: Number(svgTag.getAttribute('height')),
            elapsed
        };
    }, largeSvg);

    expect(result.hasViewBox).toBe(true);
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
    // Should complete well within the sandbox timeout (30s).
    // 10s is generous; typical should be <2s.
    expect(result.elapsed).toBeLessThan(10000);
});

test('text SVG with Scratch font produces non-zero bbox', async ({page}) => {
    const result = await page.evaluate(async (svg) => {
        const svgTag = await window.loadSvgString(svg, true /* fromVersion2 */);
        return {
            width: Number(svgTag.getAttribute('width')),
            height: Number(svgTag.getAttribute('height')),
            hasViewBox: svgTag.hasAttribute('viewBox')
        };
    }, SVG_WITH_SCRATCH_FONT);

    expect(result.hasViewBox).toBe(true);
    // Text should have measurable dimensions
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
});

test('text measurement via sandbox matches direct getBBox in parent', async ({page}) => {
    // Verifies that the sandbox measures text the same way as the parent DOM.
    // A system font (monospace) is used so both contexts see identical glyphs
    // without any font injection. fromVersion2 is omitted so no text transforms
    // are applied before the sandbox measurement — the sandbox and parent both
    // measure the same SVG.
    const svgWithSystemFont = '<svg xmlns="http://www.w3.org/2000/svg">' +
        '<text font-family="monospace" font-size="18">Test text</text>' +
        '</svg>';

    const result = await page.evaluate(async (svg) => {
        // Direct measurement in the parent document (no transforms applied).
        const container = document.createElement('span');
        container.innerHTML = svg;
        document.body.appendChild(container);
        const directBbox = container.children[0].getBBox();
        document.body.removeChild(container);

        // Measurement via loadSvgString (sandbox path, no viewBox → async measurement).
        const svgTag = await window.loadSvgString(svg);
        const viewBox = svgTag.viewBox.baseVal;

        return {
            directWidth: directBbox.width,
            directHeight: directBbox.height,
            // viewBox dimensions include the default stroke-width enlargement (+1px each).
            iframeWidth: viewBox.width,
            iframeHeight: viewBox.height
        };
    }, svgWithSystemFont);

    // The sandbox must produce the same bbox as the parent DOM
    expect(result.iframeWidth).toBe(result.directWidth + 1);
    expect(result.iframeHeight).toBe(result.directHeight + 1);
});
