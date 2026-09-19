const fs = require('fs');

/**
 * The sandbox loads `paper-core` rather than the full Paper.js build.
 *
 * That is not a preference. `paper-full` bundles the PaperScript parser, whose
 * Acorn dependency builds its keyword matchers with `new Function` at load
 * time, so the frame's policy — which grants no `'unsafe-eval'` — stops it
 * loading at all. These tests pin both halves of that reasoning: that the
 * swap is safe, and that it was necessary.
 *
 * Paper takes its Node path under jsdom, so this compares the two builds in
 * one environment rather than reproducing the browser exactly.
 */

// A path with an embedded raster.
const SVG_RASTER = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ' +
    'viewBox="0 0 100 100"><path d="M10 10 L90 10 L90 90 Z" fill="red"/>' +
    '<image x="10" y="10" width="20" height="20" xlink:href="data:image/png;base64,' +
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="/></svg>';

// Shapes with a gradient.
const SVG_GRADIENT = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>' +
    '<linearGradient id="g" x1="0" y1="0" x2="1" y2="0">' +
    '<stop offset="0" stop-color="#f00"/><stop offset="1" stop-color="#00f"/>' +
    '</linearGradient></defs>' +
    '<rect x="5" y="5" width="80" height="40" fill="url(#g)"/>' +
    '<circle cx="50" cy="70" r="20" fill="green"/></svg>';

// Text with a transform.
const SVG_TEXT = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">' +
    '<text x="10" y="50" font-family="Sans Serif" font-size="20" ' +
    'transform="rotate(15 10 50)" fill="black">Costume</text></svg>';

const readDist = file => fs.readFileSync(require.resolve(`@scratch/paper/dist/${file}`), 'utf8');

/**
 * Import an SVG with one Paper.js build and return the exported JSON.
 * @param {string} distFile The dist filename to load.
 * @param {string} svg The SVG source to import.
 * @returns {string} The exported JSON.
 */
const exportSvg = (distFile, svg) => {
    jest.resetModules();
    // eslint-disable-next-line global-require
    const paper = require(`@scratch/paper/dist/${distFile}`);
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 360;
    paper.setup(canvas);
    paper.project.clear();
    const imported = paper.project.importSVG(svg, {expandShapes: true});
    return imported.exportJSON({asString: true});
};

describe('paper-core is a safe substitute for paper-full', () => {
    test.each([
        ['a path with an embedded raster', SVG_RASTER],
        ['shapes with a gradient', SVG_GRADIENT],
        ['text with a transform', SVG_TEXT]
    ])('exports identical JSON for %s', (name, svg) => {
        const core = exportSvg('paper-core.min.js', svg);
        const full = exportSvg('paper-full.min.js', svg);

        expect(core).toBeTruthy();
        expect(core).toEqual(full);
    });
});

describe('why the swap was needed', () => {
    test('paper-full builds functions at load time and paper-core does not', () => {
        expect(readDist('paper-full.min.js')).toContain('new Function');
        expect(readDist('paper-core.min.js')).not.toContain('new Function');
    });
});

test('paper-core has nothing that would break an inline <script>', () => {
    // On file:// hosts the sandbox embeds this source in the frame document.
    // `</script` ends the element early; `<!--` puts the HTML parser into its
    // escaped state, where a later `</script>` stops terminating at all and the
    // rest of the document is swallowed. Neither has ever appeared in Paper.js,
    // so this guards the dependency bump rather than today's build.
    const source = readDist('paper-core.min.js');

    expect(source).not.toMatch(/<\/script/i);
    expect(source).not.toContain('<!--');
});
