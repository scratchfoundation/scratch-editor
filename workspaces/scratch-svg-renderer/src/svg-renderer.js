const loadSvgString = require('./load-svg-string');
const serializeSvgToString = require('./serialize-svg-to-string');

/**
 * Main quirks-mode SVG rendering code.
 * @deprecated Call into individual methods exported from this library instead.
 */
class SvgRenderer {
    /**
     * Create a quirks-mode SVG renderer for a particular canvas.
     * @param {HTMLCanvasElement} [canvas] An optional canvas element to draw to. If this is not provided, the renderer
     * will create a new canvas.
     * @constructor
     */
    constructor (canvas) {
        /**
         * The canvas that this SVG renderer will render to.
         * @type {HTMLCanvasElement}
         * @private
         */
        this._canvas = canvas || document.createElement('canvas');
        this._context = this._canvas.getContext('2d');

        /**
         * A measured SVG "viewbox"
         * @typedef {object} SvgRenderer#SvgMeasurements
         * @property {number} x - The left edge of the SVG viewbox.
         * @property {number} y - The top edge of the SVG viewbox.
         * @property {number} width - The width of the SVG viewbox.
         * @property {number} height - The height of the SVG viewbox.
         */

        /**
         * The measurement box of the currently loaded SVG.
         * @type {SvgRenderer#SvgMeasurements}
         * @private
         */
        this._measurements = {x: 0, y: 0, width: 0, height: 0};

        /**
         * The `<img>` element with the contents of the currently loaded SVG.
         * @type {?HTMLImageElement}
         * @private
         */
        this._cachedImage = null;

        /**
         * True if this renderer's current SVG is loaded and can be rendered to the canvas.
         * @type {boolean}
         */
        this.loaded = false;
    }

    /**
     * @returns {!HTMLCanvasElement} this renderer's target canvas.
     */
    get canvas () {
        return this._canvas;
    }

    /**
     * @return {Array<number>} the natural size, in Scratch units, of this SVG.
     */
    get size () {
        return [this._measurements.width, this._measurements.height];
    }

    /**
     * @return {Array<number>} the offset (upper left corner) of the SVG's view box.
     */
    get viewOffset () {
        return [this._measurements.x, this._measurements.y];
    }

    /**
     * Load an SVG string and normalize it. All the steps before drawing/measuring.
     * @param {!string} svgString String of SVG data to draw in quirks-mode.
     * @param {?boolean} fromVersion2 True if we should perform conversion from
     *     version 2 to version 3 svg.
     */
    loadString (svgString, fromVersion2) {
        // New svg string invalidates the cached image
        this._cachedImage = null;
        const svgTag = loadSvgString(svgString, fromVersion2);

        this._svgTag = svgTag;
        this._measurements = {
            width: svgTag.viewBox.baseVal.width,
            height: svgTag.viewBox.baseVal.height,
            x: svgTag.viewBox.baseVal.x,
            y: svgTag.viewBox.baseVal.y
        };
    }

    /**
     * Load an SVG string, normalize it, and prepare it for (synchronous) rendering.
     * @param {!string} svgString String of SVG data to draw in quirks-mode.
     * @param {?boolean} fromVersion2 True if we should perform conversion from version 2 to version 3 svg.
     * @param {Function} [onFinish] - An optional callback to call when the SVG is loaded and can be rendered.
     */
    loadSVG (svgString, fromVersion2, onFinish) {
        this.loadString(svgString, fromVersion2);
        this._createSVGImage(onFinish);
    }

    /**
     * Creates an <img> element for the currently loaded SVG string, then calls the callback once it's loaded.
     * @param {Function} [onFinish] - An optional callback to call when the <img> has loaded.
     */
    _createSVGImage (onFinish) {
        if (this._cachedImage === null) this._cachedImage = new Image();
        const img = this._cachedImage;

        img.onload = () => {
            this.loaded = true;
            if (onFinish) onFinish();
        };
        const svgText = this.toString(true /* shouldInjectFonts */);
        img.src = `data:image/svg+xml;utf8,${encodeURIComponent(svgText)}`;
        this.loaded = false;
    }

    /**
     * Serialize the active SVG DOM to a string.
     * @param {?boolean} shouldInjectFonts True if fonts should be included in the SVG as
     *     base64 data.
     * @returns {string} String representing current SVG data.
     * @deprecated Use the standalone `serializeSvgToString` export instead.
     */
    toString (shouldInjectFonts) {
        return serializeSvgToString(this._svgTag, shouldInjectFonts);
    }

    /**
     * Synchronously draw the loaded SVG to this renderer's `canvas`.
     * @param {number} [scale] - Optionally, also scale the image by this factor.
     */
    draw (scale) {
        if (!this.loaded) throw new Error('SVG image has not finished loading');
        this._drawFromImage(scale);
    }

    /**
     * Draw to the canvas from a loaded image element.
     * @param {number} [scale] - Optionally, also scale the image by this factor.
     **/
    _drawFromImage (scale) {
        if (this._cachedImage === null) return;

        const ratio = Number.isFinite(scale) ? scale : 1;
        const bbox = this._measurements;
        this._canvas.width = bbox.width * ratio;
        this._canvas.height = bbox.height * ratio;
        // Even if the canvas at the current scale has a nonzero size, the image's dimensions are floored pre-scaling.
        // e.g. if an image has a width of 0.4 and is being rendered at 3x scale, the canvas will have a width of 1, but
        // the image's width will be rounded down to 0 on some browsers (Firefox) prior to being drawn at that scale.
        if (
            this._canvas.width <= 0 ||
            this._canvas.height <= 0 ||
            this._cachedImage.naturalWidth <= 0 ||
            this._cachedImage.naturalHeight <= 0
        ) return;
        this._context.clearRect(0, 0, this._canvas.width, this._canvas.height);
        this._context.setTransform(ratio, 0, 0, ratio, 0, 0);
        this._context.drawImage(this._cachedImage, 0, 0);
    }
}

module.exports = SvgRenderer;
