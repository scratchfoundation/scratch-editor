/**
 * Measures SVG bounding boxes with `getBBox()` inside a sandboxed iframe.
 *
 * Scratch 2 SVGs have unreliable `width`/`height`/`viewBox`, so the real drawn
 * size has to be measured by putting the SVG in a live document. That is unsafe
 * in the editor's own document, so it happens in the frame instead.
 *
 * The Scratch font CSS is sent as init data rather than written into this file,
 * so the file can be served as a static asset.
 *
 * Untranspiled, so capped at ES2017.
 */
(function () {
    // Replaced by onSandboxInit; text measures wrong until fonts have decoded.
    let fontsReady = Promise.resolve();

    window.onSandboxInit = fontCSS => {
        const style = document.createElement('style');
        style.textContent = fontCSS;
        document.head.appendChild(style);

        // data: URIs mean no network wait, but decoding must finish before
        // getBBox is accurate for text.
        const fontPromises = [];
        document.fonts.forEach(font => {
            // Not every font is used by every SVG; one bad face must not fail all.
            fontPromises.push(font.load().catch(() => {}));
        });
        fontsReady = Promise.all(fontPromises);
    };

    const measureSvg = svgString => {
        const container = document.createElement('span');
        try {
            container.innerHTML = svgString;
            document.body.appendChild(container);
            const svgEl = container.children[0];
            if (!svgEl || typeof svgEl.getBBox !== 'function') {
                throw new Error('SVG element not found or does not support getBBox');
            }
            const bbox = svgEl.getBBox();
            return {x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height};
        } finally {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
        }
    };

    window.onSandboxMessage = payload => {
        const isBatch = Array.isArray(payload);
        const items = isBatch ? payload : [payload];

        return fontsReady.then(() => {
            const results = items.map(measureSvg);
            return isBatch ? results : results[0];
        });
    };
}());
