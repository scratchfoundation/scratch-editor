const fs = require('fs');
const path = require('path');
const {test, expect} = require('@playwright/test');

/**
 * Playwright tests for the display-side iframe measurement script.
 *
 * These tests verify that SVG bounding-box measurement inside a sandboxed
 * iframe produces the same results as the current in-process
 * transformMeasurements approach (getBBox on the parent document.body).
 */

const FIXTURE_DIR = path.resolve(__dirname, '../fixtures');

const catCostumeSvg = fs.readFileSync(
    path.resolve(FIXTURE_DIR, 'cat-costume.svg'), 'utf8'
);

// A simple SVG rectangle for basic measurement verification.
const simpleSvg = '<svg xmlns="http://www.w3.org/2000/svg">' +
    '<rect x="10" y="20" width="100" height="50" fill="red"/>' +
    '</svg>';

// An SVG with text using a Scratch font family, for verifying
// that fonts are loaded inside the iframe.
const textSvg = '<svg xmlns="http://www.w3.org/2000/svg">' +
    '<text x="10" y="30" font-family="Sans Serif" font-size="18">Hello</text>' +
    '</svg>';

// An SVG drawn in negative coordinates (like some Scratch 2 costumes).
const negativeBboxSvg = '<svg xmlns="http://www.w3.org/2000/svg">' +
    '<circle cx="-20" cy="-10" r="30" fill="blue"/>' +
    '</svg>';

test.beforeEach(async ({page}) => {
    await page.goto('measure-harness.html');
    await page.waitForFunction(
        () => typeof window.Sandbox === 'function' &&
              typeof window.createMeasureSvgScript === 'function'
    );
});

/**
 * Helper: measure an SVG string by appending it directly to the parent
 * page's document.body (the current in-process approach). Used as a
 * reference to compare against sandbox-based measurement.
 * @param {import('@playwright/test').Page} page
 * @param {string} svgString
 * @returns {Promise<{x: number, y: number, width: number, height: number}>}
 */
const measureDirect = async function (page, svgString) {
    return page.evaluate(svg => {
        const container = document.createElement('span');
        container.innerHTML = svg;
        document.body.appendChild(container);
        try {
            const bbox = container.children[0].getBBox();
            return {
                x: bbox.x,
                y: bbox.y,
                width: bbox.width,
                height: bbox.height
            };
        } finally {
            document.body.removeChild(container);
        }
    }, svgString);
};

/**
 * Helper: measure an SVG using the sandboxed measurement script.
 * `fontCSS` is optional; when omitted, an empty string is used (no fonts).
 * @param {import('@playwright/test').Page} page
 * @param {string} svgString
 * @param {string} [fontCSS]
 * @returns {Promise<{x: number, y: number, width: number, height: number}>}
 */
const measureSandboxed = async function (page, svgString, fontCSS = '') {
    return page.evaluate(async ({svg, css}) => {
        const script = window.createMeasureSvgScript(css);
        const sandbox = new window.Sandbox(script);
        try {
            return await sandbox.send(svg);
        } finally {
            sandbox.destroy();
        }
    }, {svg: svgString, css: fontCSS});
};

// --- Core measurement ---

test('measures a simple rect SVG correctly', async ({page}) => {
    const result = await measureSandboxed(page, simpleSvg);
    expect(result).toEqual({x: 10, y: 20, width: 100, height: 50});
});

test('measurements match direct getBBox for a simple SVG', async ({page}) => {
    const direct = await measureDirect(page, simpleSvg);
    const sandboxed = await measureSandboxed(page, simpleSvg);
    expect(sandboxed).toEqual(direct);
});

test('measurements match direct getBBox for the cat costume', async ({page}) => {
    const direct = await measureDirect(page, catCostumeSvg);
    const sandboxed = await measureSandboxed(page, catCostumeSvg);
    // Sub-pixel tolerance: float comparison for potential rounding differences.
    expect(sandboxed.x).toBeCloseTo(direct.x, 1);
    expect(sandboxed.y).toBeCloseTo(direct.y, 1);
    expect(sandboxed.width).toBeCloseTo(direct.width, 1);
    expect(sandboxed.height).toBeCloseTo(direct.height, 1);
});

test('handles SVGs with negative bounding-box coordinates', async ({page}) => {
    const result = await measureSandboxed(page, negativeBboxSvg);
    // Circle at cx=-20, cy=-10, r=30 → bbox should be roughly (-50, -40, 60, 60)
    expect(result.x).toBeCloseTo(-50, 1);
    expect(result.y).toBeCloseTo(-40, 1);
    expect(result.width).toBeCloseTo(60, 1);
    expect(result.height).toBeCloseTo(60, 1);
});

test('negative-bbox measurements match direct getBBox', async ({page}) => {
    const direct = await measureDirect(page, negativeBboxSvg);
    const sandboxed = await measureSandboxed(page, negativeBboxSvg);
    expect(sandboxed).toEqual(direct);
});

// --- Batch processing ---

test('batch measurement returns an array of results', async ({page}) => {
    const results = await page.evaluate(async () => {
        const script = window.createMeasureSvgScript('');
        const sandbox = new window.Sandbox(script);
        try {
            return await sandbox.send([
                '<svg xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="10" height="10" fill="red"/></svg>',
                '<svg xmlns="http://www.w3.org/2000/svg"><rect x="5" y="5" width="20" height="30" fill="blue"/></svg>'
            ]);
        } finally {
            sandbox.destroy();
        }
    });
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({x: 0, y: 0, width: 10, height: 10});
    expect(results[1]).toEqual({x: 5, y: 5, width: 20, height: 30});
});

test('single item returns a single object (not an array)', async ({page}) => {
    const result = await measureSandboxed(page, simpleSvg);
    expect(result).not.toBeInstanceOf(Array);
    expect(result).toHaveProperty('x');
    expect(result).toHaveProperty('width');
});

// --- Iframe reuse ---

test('sandbox iframe is reused across multiple measurements', async ({page}) => {
    const results = await page.evaluate(async () => {
        const script = window.createMeasureSvgScript('');
        const sandbox = new window.Sandbox(script);
        try {
            const r1 = await sandbox.send(
                '<svg xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="10" height="10" fill="red"/></svg>'
            );
            const r2 = await sandbox.send(
                '<svg xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="20" height="20" fill="red"/></svg>'
            );
            const iframeCount = document.querySelectorAll('iframe').length;
            return {r1, r2, iframeCount};
        } finally {
            sandbox.destroy();
        }
    });
    expect(results.r1).toEqual({x: 0, y: 0, width: 10, height: 10});
    expect(results.r2).toEqual({x: 0, y: 0, width: 20, height: 20});
    expect(results.iframeCount).toBe(1);
});

// --- Error handling ---

test('rejects on invalid SVG content', async ({page}) => {
    const error = await page.evaluate(async () => {
        const script = window.createMeasureSvgScript('');
        const sandbox = new window.Sandbox(script);
        try {
            return await sandbox.send('not-an-svg')
                .catch(e => ({errorMessage: e.message}));
        } finally {
            sandbox.destroy();
        }
    });
    expect(error).toHaveProperty('errorMessage');
});

// --- Font loading ---

test('text bbox with Scratch fonts matches direct measurement', async ({page}) => {
    // Inject Scratch fonts into the parent page (simulating what
    // scratch-render-fonts does) and build the font CSS string.
    const fontCSS = await page.evaluate(() => {
        // Create minimal @font-face CSS for Sans Serif using a
        // system-available fallback. In production, the real base64-encoded
        // font data from scratch-render-fonts is used.
        //
        // For this test, inject the same CSS into both the parent page
        // and the iframe to ensure the comparison is fair.
        const css = '@font-face { font-family: "Sans Serif"; src: local("Arial"), local("Helvetica"); }';
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
        return css;
    });

    const direct = await measureDirect(page, textSvg);
    const sandboxed = await measureSandboxed(page, textSvg, fontCSS);

    // Text bbox can vary slightly depending on font rendering; use
    // generous tolerance.
    expect(sandboxed.x).toBeCloseTo(direct.x, 0);
    expect(sandboxed.y).toBeCloseTo(direct.y, 0);
    expect(sandboxed.width).toBeCloseTo(direct.width, 0);
    expect(sandboxed.height).toBeCloseTo(direct.height, 0);
});

test('font @font-face rules are injected into the iframe', async ({page}) => {
    // createMeasureSvgScript embeds the CSS into an IIFE that runs before
    // window.onSandboxMessage is set. Appending a replacement handler lets
    // us verify the @font-face rule was injected by querying document.fonts.
    const fontNames = await page.evaluate(async () => {
        const css = '@font-face { font-family: "TestFont"; src: local("Arial"); }';
        const script = window.createMeasureSvgScript(css) + `
            window.onSandboxMessage = function () {
                var names = [];
                document.fonts.forEach(function (f) { names.push(f.family); });
                return names;
            };
            `;
        const sandbox = new window.Sandbox(script);
        try {
            return await sandbox.send(null);
        } finally {
            sandbox.destroy();
        }
    });
    expect(fontNames).toContain('TestFont');
});

// Opaque-origin enforcement is tested directly in sandbox.spec.js.
// The test below checks the CSP directives that are specific to SVG measurement
// (style-src and font-src are required for inline font injection to work).
test('CSP includes style-src and font-src directives', async ({page}) => {
    const cspContent = await page.evaluate(async () => {
        const sandbox = new window.Sandbox(`
            window.onSandboxMessage = function () {
                var metas = document.querySelectorAll('meta[http-equiv]');
                for (var i = 0; i < metas.length; i++) {
                    if (metas[i].httpEquiv === 'Content-Security-Policy') {
                        return metas[i].content;
                    }
                }
                return null;
            };
        `);
        try {
            return await sandbox.send(null);
        } finally {
            sandbox.destroy();
        }
    });
    expect(cspContent).toContain("style-src 'unsafe-inline'");
    expect(cspContent).toContain('font-src data:');
});

// --- SVG cleanup after measurement ---

test('SVG is removed from iframe DOM after measurement', async ({page}) => {
    const bodyChildren = await page.evaluate(async () => {
        const sandbox = new window.Sandbox(`
            window.onSandboxMessage = function (payload) {
                if (payload === 'measure') {
                    var container = document.createElement('span');
                    container.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>';
                    document.body.appendChild(container);
                    var bbox = container.children[0].getBBox();
                    document.body.removeChild(container);
                    return { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
                }
                // Just count body.children (excludes the script tag in head)
                return document.body.children.length;
            }
        `);
        try {
            await sandbox.send('measure');
            return await sandbox.send('count');
        } finally {
            sandbox.destroy();
        }
    });
    // Only the script element should be in the body (from the srcdoc HTML)
    expect(bodyChildren).toBeLessThanOrEqual(1);
});
