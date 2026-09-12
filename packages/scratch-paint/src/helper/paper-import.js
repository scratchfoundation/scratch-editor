/* global paper */

/**
 * Imports an SVG costume with Paper.js inside a sandboxed iframe and returns it
 * as JSON. Never runs in the parent page.
 *
 * `paper.project.importSVG` appends the parsed SVG into the document while it
 * works. Doing that in the editor's own document is the attack described in the
 * paperjs-xss analysis, so it happens in the frame instead, where the opaque
 * origin contains anything the SVG triggers.
 *
 * Paper.js is loaded as a separate script before this one, so the `paper`
 * global is already defined. See `paper-sandbox.js`.
 *
 * Untranspiled, so capped at ES2017.
 */
(function () {
    // Paper needs a canvas to set up its project and coordinate system, even
    // though only SVG import and JSON export are used here.
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 360;
    document.body.appendChild(canvas);
    paper.setup(canvas);

    const readViewBox = svg => {
        const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
        const viewBoxAttr = doc.documentElement.getAttribute('viewBox');
        if (!viewBoxAttr) return null;
        const parts = viewBoxAttr.match(/\S+/g);
        return parts ? parts.map(parseFloat) : null;
    };

    /**
     * Resolve once every embedded raster has settled.
     *
     * Paper positions each `<image>` raster in a 'load' handler that runs after
     * `onLoad` returns, so nothing is placed yet when import completes.
     * Serializing then would export them at the origin, putting them in the
     * wrong place after re-import. A raster that errors never fires 'load', so
     * settle on 'error' too and let one broken image through rather than
     * stalling the whole import.
     */
    const rastersSettled = imported => new Promise(resolve => {
        const rasters = imported.className === 'Raster' ?
            [imported] :
            imported.getItems({class: paper.Raster});

        if (rasters.length === 0) {
            resolve();
            return;
        }

        let remaining = rasters.length;
        const onSettled = () => {
            remaining -= 1;
            if (remaining === 0) resolve();
        };
        rasters.forEach(raster => {
            raster.on('load', onSettled);
            raster.on('error', onSettled);
        });
    });

    window.onSandboxMessage = payload => {
        const svg = payload.svg;
        const viewBox = readViewBox(svg);

        // Clear previous state so successive imports don't accumulate items.
        paper.project.clear();

        return new Promise((resolve, reject) => {
            paper.project.importSVG(svg, {
                expandShapes: true,
                onLoad: imported => {
                    if (!imported) {
                        reject(new Error('SVG import failed'));
                        return;
                    }
                    rastersSettled(imported).then(() => {
                        // Export the imported item rather than the whole
                        // project; the parent re-creates it with
                        // activeLayer.importJSON().
                        resolve({
                            paperJSON: imported.exportJSON({asString: true}),
                            viewBox: viewBox
                        });
                    });
                },
                onError: message => reject(new Error(`SVG import error: ${message}`))
            });
        });
    };
}());
