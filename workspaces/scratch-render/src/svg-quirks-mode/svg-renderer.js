// Synchronously load TTF fonts.
// First, have Webpack load their data as Base 64 strings.
/* eslint-disable global-require */
const FONTS = {
    Donegal: require('base64!scratch-render-fonts/DonegalOne-Regular.ttf'),
    Gloria: require('base64!scratch-render-fonts/GloriaHallelujah.ttf'),
    Mystery: require('base64!scratch-render-fonts/MysteryQuest-Regular.ttf'),
    Marker: require('base64!scratch-render-fonts/PermanentMarker.ttf'),
    Scratch: require('base64!scratch-render-fonts/Scratch.ttf')
};
/* eslint-enable global-require */

// For each Base 64 string,
// 1. Replace each with a usable @font-face tag that points to a Data URI.
// 2. Inject the font into a style on `document.body`, so measurements
//    can be accurately taken in SvgRenderer._transformMeasurements.
const documentStyleTag = document.createElement('style');
documentStyleTag.id = 'scratch-font-styles';
for (const fontName in FONTS) {
    const fontData = FONTS[fontName];
    FONTS[fontName] = '@font-face {' +
        `font-family: "${fontName}";src: url("data:application/x-font-ttf;charset=utf-8;base64,${fontData}");}`;
    documentStyleTag.textContent += FONTS[fontName];
}
document.body.insertBefore(documentStyleTag, document.body.firstChild);

/**
 * Main quirks-mode SVG rendering code.
 */
class SvgRenderer {
    /**
     * Create a quirks-mode SVG renderer for a particular canvas.
     * @param {HTMLCanvasElement} [canvas] An optional canvas element to draw to. If this is not provided, the renderer
     * will create a new canvas.
     * @constructor
     */
    constructor (canvas) {
        this._canvas = canvas || document.createElement('canvas');
        this._context = this._canvas.getContext('2d');
    }

    /**
     * @returns {!HTMLCanvasElement} this renderer's target canvas.
     */
    get canvas () {
        return this._canvas;
    }

    /**
     * Load an SVG from a string and draw it.
     * This will be parsed and transformed, and finally drawn.
     * When drawing is finished, the `onFinish` callback is called.
     * @param {string} svgString String of SVG data to draw in quirks-mode.
     * @param {Function=} onFinish Optional callback for when drawing finished.
     */
    fromString (svgString, onFinish) {
        // Store the callback for later.
        this._onFinish = onFinish;
        // Parse string into SVG XML.
        const parser = new DOMParser();
        this._svgDom = parser.parseFromString(svgString, 'text/xml');
        if (this._svgDom.children.length < 1 ||
            this._svgDom.children[0].localName !== 'svg') {
            throw new Error('Document does not appear to be SVG.');
        }
        this._svgTag = this._svgDom.children[0];
        // Transform all text elements.
        this._transformText();
        // Transform measurements.
        this._transformMeasurements();
        // Draw to a canvas.
        this._draw();
    }

    /**
     * Transforms an SVG's text elements for Scratch 2.0 quirks.
     * These quirks include:
     * 1. `x` and `y` properties are removed/ignored.
     * 2. Alignment is set to `text-before-edge`.
     * 3. Line-breaks are converted to explicit <tspan> elements.
     * 4. Any required fonts are injected.
     */
    _transformText () {
        // Collect all text elements into a list.
        const textElements = [];
        const collectText = domElement => {
            if (domElement.localName === 'text') {
                textElements.push(domElement);
            }
            for (let i = 0; i < domElement.children.length; i++) {
                collectText(domElement.children[i]);
            }
        };
        collectText(this._svgTag);
        // For each text element, apply quirks.
        const fontsNeeded = {};
        for (const textElement of textElements) {
            // Remove x and y attributes - they are not used in Scratch.
            textElement.removeAttribute('x');
            textElement.removeAttribute('y');
            // Set text-before-edge alignment:
            // Scratch renders all text like this.
            textElement.setAttribute('alignment-baseline', 'text-before-edge');
            // If there's no font size provided, provide one.
            if (!textElement.getAttribute('font-size')) {
                textElement.setAttribute('font-size', '18');
            }
            // If there's no font-family provided, provide one.
            if (!textElement.getAttribute('font-family')) {
                textElement.setAttribute('font-family', 'Helvetica');
            }
            // Collect fonts that need injection.
            const font = textElement.getAttribute('font-family');
            fontsNeeded[font] = true;
            // Fix line breaks in text, which are not natively supported by SVG.
            let text = textElement.textContent;
            if (text) {
                textElement.textContent = '';
                const lines = text.split('\n');
                text = '';
                for (const line of lines) {
                    const tspanNode = this._createSVGElement('tspan');
                    tspanNode.setAttribute('x', '0');
                    tspanNode.setAttribute('dy', '1em');
                    tspanNode.textContent = line;
                    textElement.appendChild(tspanNode);
                }
            }
        }
        // Inject fonts that are needed.
        // It would be nice if there were another way to get the SVG-in-canvas
        // to render the correct font family, but I couldn't find any other way.
        // Other things I tried:
        // Just injecting the font-family into the document: no effect.
        // External stylesheet linked to by SVG: no effect.
        // Using a <link> or <style>@import</style> to link to font-family
        // injected into the document: no effect.
        const newDefs = this._createSVGElement('defs');
        const newStyle = this._createSVGElement('style');
        const allFonts = Object.keys(fontsNeeded);
        for (const font of allFonts) {
            if (FONTS.hasOwnProperty(font)) {
                newStyle.textContent += FONTS[font];
            }
        }
        newDefs.appendChild(newStyle);
        this._svgTag.insertBefore(newDefs, this._svgTag.children[0]);
    }

    /**
     * Transform the measurements of the SVG.
     * In Scratch 2.0, SVGs are drawn without respect to the width,
     * height, and viewBox attribute on the tag. The exporter
     * does output these properties - but they appear to be incorrect often.
     * To address the incorrect measurements, we append the DOM to the
     * document, and then use SVG's native `getBBox` to find the real
     * drawn dimensions. This ensures things drawn in negative dimensions,
     * outside the given viewBox, etc., are all eventually drawn to the canvas.
     * I tried to do this several other ways: stripping the width/height/viewBox
     * attributes and then drawing (Firefox won't draw anything),
     * or inflating them and then measuring a canvas. But this seems to be
     * a natural and performant way.
     */
    _transformMeasurements () {
        // Save `svgText` for later re-parsing.
        const svgText = this._toString();

        // Append the SVG dom to the document.
        // This allows us to use `getBBox` on the page,
        // which returns the full bounding-box of all drawn SVG
        // elements, similar to how Scratch 2.0 did measurement.
        const svgSpot = document.createElement('span');
        let bbox;
        try {
            document.body.appendChild(svgSpot);
            svgSpot.appendChild(this._svgTag);
            // Take the bounding box.
            bbox = this._svgTag.getBBox();
        } finally {
            // Always destroy the element, even if, for example, getBBox throws.
            document.body.removeChild(svgSpot);
        }

        // Re-parse the SVG from `svgText`. The above DOM becomes
        // unusable/undrawable in browsers once it's appended to the page,
        // perhaps for security reasons?
        const parser = new DOMParser();
        this._svgDom = parser.parseFromString(svgText, 'text/xml');
        this._svgTag = this._svgDom.children[0];

        // Set the correct measurements on the SVG tag, and save them.
        this._svgTag.setAttribute('width', bbox.width);
        this._svgTag.setAttribute('height', bbox.height);
        this._svgTag.setAttribute('viewBox',
            `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
        this._measurements = bbox;
    }

    /**
     * Serialize the active SVG DOM to a string.
     * @returns {string} String representing current SVG data.
     */
    _toString () {
        const serializer = new XMLSerializer();
        return serializer.serializeToString(this._svgDom);
    }

    /**
     * Get the drawing ratio, adjusted for HiDPI screens.
     * @return {number} Scale ratio to draw to canvases with.
     */
    getDrawRatio () {
        const devicePixelRatio = window.devicePixelRatio || 1;
        const backingStoreRatio = this._context.webkitBackingStorePixelRatio ||
            this._context.mozBackingStorePixelRatio ||
            this._context.msBackingStorePixelRatio ||
            this._context.oBackingStorePixelRatio ||
            this._context.backingStorePixelRatio || 1;
        return devicePixelRatio / backingStoreRatio;
    }

    /**
     * Draw the SVG to a canvas.
     */
    _draw () {
        const ratio = this.getDrawRatio();
        const bbox = this._measurements;

        // Set up the canvas for drawing.
        this._canvas.width = bbox.width * ratio;
        this._canvas.height = bbox.height * ratio;
        this._context.clearRect(0, 0, this._canvas.width, this._canvas.height);
        this._context.scale(ratio, ratio);

        // Convert the SVG text to an Image, and then draw it to the canvas.
        const img = new Image();
        img.onload = () => {
            this._context.drawImage(img, 0, 0);
            // Reset the canvas transform after drawing.
            this._context.setTransform(1, 0, 0, 1, 0, 0);
            // Set the CSS style of the canvas to the actual measurements.
            this._canvas.style.width = bbox.width;
            this._canvas.style.height = bbox.height;
            // All finished - call the callback if provided.
            if (this._onFinish) {
                this._onFinish();
            }
        };
        const svgText = this._toString();
        img.src = `data:image/svg+xml;utf8,${encodeURIComponent(svgText)}`;
    }

    /**
     * Helper to create an SVG element with the correct NS.
     * @param {string} tagName Tag name for the element.
     * @return {!DOMElement} Element created.
     */
    _createSVGElement (tagName) {
        return document.createElementNS(
            'http://www.w3.org/2000/svg', tagName
        );
    }
}

module.exports = SvgRenderer;
