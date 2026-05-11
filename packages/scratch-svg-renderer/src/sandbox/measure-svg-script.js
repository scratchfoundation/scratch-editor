/**
 * Build the script string that runs inside a sandboxed iframe to measure
 * SVG bounding boxes via `getBBox()`.
 *
 * The returned script injects Scratch's `\@font-face` rules into the iframe
 * document and eagerly loads all registered fonts so that text-bearing
 * SVGs produce accurate bounding boxes.
 * @param {string} fontCSS Concatenated `\@font-face` CSS rules for all
 *     Scratch fonts (from scratch-render-fonts). Each rule should use a
 *     `data:` URI so fonts load without network access.
 * @returns {string} Script source to pass to `new Sandbox(script)`.
 */
const createMeasureSvgScript = fontCSS => {
    const fontCSSLiteral = JSON.stringify(fontCSS);

    // The script is eval'd inside the sandboxed iframe. It must use only
    // ES5-compatible syntax (no arrow functions, no const/let in loops)
    // for maximum browser compatibility, since the iframe runs whatever
    // the browser ships natively — no transpilation.
    return `(function () {
    // Inject Scratch font @font-face rules into the iframe document.
    var style = document.createElement('style');
    style.textContent = ${fontCSSLiteral};
    document.head.appendChild(style);

    // Eagerly load every registered font face. The fonts use data: URIs
    // so this is essentially instant (no network), but the browser still
    // needs to decode and register them before getBBox returns accurate
    // results for text-bearing SVGs.
    var fontPromises = [];
    document.fonts.forEach(function (f) {
        fontPromises.push(f.load().catch(function () {
            // Ignore individual font-load failures; not every font is
            // used by every measured SVG.
        }));
    });
    var fontsReady = Promise.all(fontPromises);

    /**
     * Measure a single SVG string and return its bounding box.
     */
    function measureSvg(svgString) {
        var container = document.createElement('span');
        try {
            container.innerHTML = svgString;
            document.body.appendChild(container);
            var svgEl = container.children[0];
            if (!svgEl || typeof svgEl.getBBox !== 'function') {
                throw new Error('SVG element not found or does not support getBBox');
            }
            var bbox = svgEl.getBBox();
            return {
                x: bbox.x,
                y: bbox.y,
                width: bbox.width,
                height: bbox.height
            };
        } finally {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
        }
    }

    window.onSandboxMessage = function (payload) {
        var isBatch = Array.isArray(payload);
        var items = isBatch ? payload : [payload];

        return fontsReady.then(function () {
            var results = [];
            for (var i = 0; i < items.length; i++) {
                results.push(measureSvg(items[i]));
            }
            return isBatch ? results : results[0];
        });
    };
})();`;
};

// Support both CommonJS (Node / bundler) and plain browser <script> inclusion.
if (typeof module === 'undefined') {
    window.createMeasureSvgScript = createMeasureSvgScript;
} else {
    module.exports = {createMeasureSvgScript};
}
