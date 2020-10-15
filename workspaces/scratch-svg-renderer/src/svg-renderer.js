const DOMPurify = require('dompurify');
const inlineSvgFonts = require('./font-inliner');
const SvgElement = require('./svg-element');
const convertFonts = require('./font-converter');
const fixupSvgString = require('./fixup-svg-string');
const transformStrokeWidths = require('./transform-applier');

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
        this._measurements = {x: 0, y: 0, width: 0, height: 0};
        this._cachedImage = null;
        this.loaded = false;
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
     * @param {number} [scale] - Optionally, also scale the image by this factor.
     * @param {Function} [onFinish] Optional callback for when drawing finished.
     * @deprecated Use the `loadSVG` method and public `draw` method instead.
     */
    fromString (svgString, scale, onFinish) {
        this.loadSVG(svgString, false, () => {
            this.draw(scale);
            if (onFinish) onFinish();
        });
    }

    /**
     * Load an SVG from a string and measure it.
     * @param {string} svgString String of SVG data to draw in quirks-mode.
     * @return {object} the natural size, in Scratch units, of this SVG.
     */
    measure (svgString) {
        this.loadString(svgString);
        return this._measurements;
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

        // Parse string into SVG XML.
        const parser = new DOMParser();
        svgString = fixupSvgString(svgString);
        this._svgDom = parser.parseFromString(svgString, 'text/xml');
        if (this._svgDom.childNodes.length < 1 ||
            this._svgDom.documentElement.localName !== 'svg') {
            throw new Error('Document does not appear to be SVG.');
        }
        this._svgTag = this._svgDom.documentElement;
        if (fromVersion2) {
            // Fix gradients. Scratch 2 exports no x2 when x2 = 0, but
            // SVG default is that x2 is 1. This must be done before
            // transformStrokeWidths since transformStrokeWidths affects
            // gradients.
            this._transformGradients();
        }
        transformStrokeWidths(this._svgTag, window);
        this._transformImages(this._svgTag);
        if (fromVersion2) {
            // Transform all text elements.
            this._transformText();
            // Transform measurements.
            this._transformMeasurements();
            // Fix stroke roundedness.
            this._setGradientStrokeRoundedness();
        } else if (!this._svgTag.getAttribute('viewBox')) {
            // Renderer expects a view box.
            this._transformMeasurements();
        } else if (!this._svgTag.getAttribute('width') || !this._svgTag.getAttribute('height')) {
            this._svgTag.setAttribute('width', this._svgTag.viewBox.baseVal.width);
            this._svgTag.setAttribute('height', this._svgTag.viewBox.baseVal.height);
        }
        this._measurements = {
            width: this._svgTag.viewBox.baseVal.width,
            height: this._svgTag.viewBox.baseVal.height,
            x: this._svgTag.viewBox.baseVal.x,
            y: this._svgTag.viewBox.baseVal.y
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
            for (let i = 0; i < domElement.childNodes.length; i++) {
                collectText(domElement.childNodes[i]);
            }
        };
        collectText(this._svgTag);
        convertFonts(this._svgTag);
        // For each text element, apply quirks.
        for (const textElement of textElements) {
            // Remove x and y attributes - they are not used in Scratch.
            textElement.removeAttribute('x');
            textElement.removeAttribute('y');
            // Set text-before-edge alignment:
            // Scratch renders all text like this.
            textElement.setAttribute('alignment-baseline', 'text-before-edge');
            textElement.setAttribute('xml:space', 'preserve');
            // If there's no font size provided, provide one.
            if (!textElement.getAttribute('font-size')) {
                textElement.setAttribute('font-size', '18');
            }
            let text = textElement.textContent;

            // Fix line breaks in text, which are not natively supported by SVG.
            // Only fix if text does not have child tspans.
            // @todo this will not work for font sizes with units such as em, percent
            // However, text made in scratch 2 should only ever export size 22 font.
            const fontSize = parseFloat(textElement.getAttribute('font-size'));
            const tx = 2;
            let ty = 0;
            let spacing = 1.2;
            // Try to match the position and spacing of Scratch 2.0's fonts.
            // Different fonts seem to use different line spacing.
            // Scratch 2 always uses alignment-baseline=text-before-edge
            // However, most SVG readers don't support this attribute
            // or don't support it alongside use of tspan, so the translations
            // here are to make up for that.
            if (textElement.getAttribute('font-family') === 'Handwriting') {
                spacing = 2;
                ty = -11 * fontSize / 22;
            } else if (textElement.getAttribute('font-family') === 'Scratch') {
                spacing = 0.89;
                ty = -3 * fontSize / 22;
            } else if (textElement.getAttribute('font-family') === 'Curly') {
                spacing = 1.38;
                ty = -6 * fontSize / 22;
            } else if (textElement.getAttribute('font-family') === 'Marker') {
                spacing = 1.45;
                ty = -6 * fontSize / 22;
            } else if (textElement.getAttribute('font-family') === 'Sans Serif') {
                spacing = 1.13;
                ty = -3 * fontSize / 22;
            } else if (textElement.getAttribute('font-family') === 'Serif') {
                spacing = 1.25;
                ty = -4 * fontSize / 22;
            }

            if (textElement.transform.baseVal.numberOfItems === 0) {
                const transform = this._svgTag.createSVGTransform();
                textElement.transform.baseVal.appendItem(transform);
            }

            // Right multiply matrix by a translation of (tx, ty)
            const mtx = textElement.transform.baseVal.getItem(0).matrix;
            mtx.e += (mtx.a * tx) + (mtx.c * ty);
            mtx.f += (mtx.b * tx) + (mtx.d * ty);

            if (text && textElement.childElementCount === 0) {
                textElement.textContent = '';
                const lines = text.split('\n');
                text = '';
                for (const line of lines) {
                    const tspanNode = SvgElement.create('tspan');
                    tspanNode.setAttribute('x', '0');
                    tspanNode.setAttribute('style', 'white-space: pre');
                    tspanNode.setAttribute('dy', `${spacing}em`);
                    tspanNode.textContent = line ? line : ' ';
                    textElement.appendChild(tspanNode);
                }
            }
        }
    }

    /**
     * @param {string} [tagName] svg tag to search for (or collect all elements if not given)
     * @return {Array} a list of elements with the given tagname in _svgTag
     */
    _collectElements (tagName) {
        const elts = [];
        const collectElements = domElement => {
            if ((domElement.localName === tagName || typeof tagName === 'undefined') && domElement.getAttribute) {
                elts.push(domElement);
            }
            for (let i = 0; i < domElement.childNodes.length; i++) {
                collectElements(domElement.childNodes[i]);
            }
        };
        collectElements(this._svgTag);
        return elts;
    }

    /**
     * Fix SVGs to comply with SVG spec. Scratch 2 defaults to x2 = 0 when x2 is missing, but
     * SVG defaults to x2 = 1 when missing.
     */
    _transformGradients () {
        const linearGradientElements = this._collectElements('linearGradient');

        // For each gradient element, supply x2 if necessary.
        for (const gradientElement of linearGradientElements) {
            if (!gradientElement.getAttribute('x2')) {
                gradientElement.setAttribute('x2', '0');
            }
        }
    }

    /**
     * Fix SVGs to match appearance in Scratch 2, which used nearest neighbor scaling for bitmaps
     * within SVGs.
     */
    _transformImages () {
        const imageElements = this._collectElements('image');

        // For each image element, set image rendering to pixelated
        const pixelatedImages = 'image-rendering: optimizespeed; image-rendering: pixelated;';
        for (const elt of imageElements) {
            if (elt.getAttribute('style')) {
                elt.setAttribute('style',
                    `${pixelatedImages} ${elt.getAttribute('style')}`);
            } else {
                elt.setAttribute('style', pixelatedImages);
            }
        }
    }

    /**
     * Find the largest stroke width in the svg. If a shape has no
     * `stroke` property, it has a stroke-width of 0. If it has a `stroke`,
     * it is by default a stroke-width of 1.
     * This is used to enlarge the computed bounding box, which doesn't take
     * stroke width into account.
     * @param {SVGSVGElement} rootNode The root SVG node to traverse.
     * @return {number} The largest stroke width in the SVG.
     */
    _findLargestStrokeWidth (rootNode) {
        let largestStrokeWidth = 0;
        const collectStrokeWidths = domElement => {
            if (domElement.getAttribute) {
                if (domElement.getAttribute('stroke')) {
                    largestStrokeWidth = Math.max(largestStrokeWidth, 1);
                }
                if (domElement.getAttribute('stroke-width')) {
                    largestStrokeWidth = Math.max(
                        largestStrokeWidth,
                        Number(domElement.getAttribute('stroke-width')) || 0
                    );
                }
            }
            for (let i = 0; i < domElement.childNodes.length; i++) {
                collectStrokeWidths(domElement.childNodes[i]);
            }
        };
        collectStrokeWidths(rootNode);
        return largestStrokeWidth;
    }

    /**
     * Find all instances of a URL-referenced `stroke` in the svg. In 2.0, all gradient strokes
     * have a round `stroke-linejoin` and `stroke-linecap`... for some reason.
     */
    _setGradientStrokeRoundedness () {
        const elements = this._collectElements();

        for (const elt of elements) {
            if (!elt.style) continue;
            const stroke = elt.style.stroke || elt.getAttribute('stroke');
            if (stroke && stroke.match(/^url\(#.*\)$/)) {
                elt.style['stroke-linejoin'] = 'round';
                elt.style['stroke-linecap'] = 'round';
            }
        }
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
        // Append the SVG dom to the document.
        // This allows us to use `getBBox` on the page,
        // which returns the full bounding-box of all drawn SVG
        // elements, similar to how Scratch 2.0 did measurement.
        const svgSpot = document.createElement('span');
        // Since we're adding user-provided SVG to document.body,
        // sanitizing is required. This should not affect bounding box calculation.
        // outerHTML is attribute of Element (and not HTMLElement), so use it instead of
        // calling serializer or toString()
        // NOTE: this._svgTag remains untouched!
        const rawValue = this._svgTag.outerHTML;
        const sanitizedValue = DOMPurify.sanitize(rawValue, {
            // Use SVG profile (no HTML elements)
            USE_PROFILES: {svg: true},
            // Remove some tags that Scratch does not use.
            FORBID_TAGS: ['a', 'audio', 'canvas', 'video'],
            // Allow data URI in image tags (e.g. SVGs converted from bitmap)
            ADD_DATA_URI_TAGS: ['image']
        });
        let bbox;
        try {
            // Insert sanitized value.
            svgSpot.innerHTML = sanitizedValue;
            document.body.appendChild(svgSpot);
            // Take the bounding box. We have to get elements via svgSpot
            // because we added it via innerHTML.
            bbox = svgSpot.children[0].getBBox();
        } finally {
            // Always destroy the element, even if, for example, getBBox throws.
            document.body.removeChild(svgSpot);
        }

        // Enlarge the bbox from the largest found stroke width
        // This may have false-positives, but at least the bbox will always
        // contain the full graphic including strokes.
        // If the width or height is zero however, don't enlarge since
        // they won't have a stroke width that needs to be enlarged.
        let halfStrokeWidth;
        if (bbox.width === 0 || bbox.height === 0) {
            halfStrokeWidth = 0;
        } else {
            halfStrokeWidth = this._findLargestStrokeWidth(this._svgTag) / 2;
        }
        const width = bbox.width + (halfStrokeWidth * 2);
        const height = bbox.height + (halfStrokeWidth * 2);
        const x = bbox.x - halfStrokeWidth;
        const y = bbox.y - halfStrokeWidth;

        // Set the correct measurements on the SVG tag
        this._svgTag.setAttribute('width', width);
        this._svgTag.setAttribute('height', height);
        this._svgTag.setAttribute('viewBox',
            `${x} ${y} ${width} ${height}`);
    }

    /**
     * Serialize the active SVG DOM to a string.
     * @param {?boolean} shouldInjectFonts True if fonts should be included in the SVG as
     *     base64 data.
     * @returns {string} String representing current SVG data.
     */
    toString (shouldInjectFonts) {
        const serializer = new XMLSerializer();
        let string = serializer.serializeToString(this._svgDom);
        if (shouldInjectFonts) {
            string = inlineSvgFonts(string);
        }
        return string;
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
     * Asynchronously draw the (possibly non-loaded) SVG to a canvas.
     * @param {number} [scale] - Optionally, also scale the image by this factor.
     * @param {Function} [onFinish] - An optional callback to call when the draw operation is complete.
     * @deprecated Use the `loadSVG` and public `draw` method instead.
     */
    _draw (scale, onFinish) {
        // Convert the SVG text to an Image, and then draw it to the canvas.
        if (this._cachedImage === null) {
            this._createSVGImage(() => {
                this._drawFromImage(scale);
                onFinish();
            });
        } else {
            this._drawFromImage(scale);
            onFinish();
        }
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
        this._context.scale(ratio, ratio);
        this._context.drawImage(this._cachedImage, 0, 0);
        // Reset the canvas transform after drawing.
        this._context.setTransform(1, 0, 0, 1, 0, 0);
        // Set the CSS style of the canvas to the actual measurements.
        this._canvas.style.width = bbox.width;
        this._canvas.style.height = bbox.height;
    }
}

module.exports = SvgRenderer;
