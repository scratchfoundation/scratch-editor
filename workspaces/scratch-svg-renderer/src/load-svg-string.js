const DOMPurify = require('dompurify');
const SvgElement = require('./svg-element');
const convertFonts = require('./font-converter');
const fixupSvgString = require('./fixup-svg-string');
const transformStrokeWidths = require('./transform-applier');

/**
 * @param {SVGElement} svgTag the tag to search within
 * @param {string} [tagName] svg tag to search for (or collect all elements if not given)
 * @return {Array} a list of elements with the given tagname
 */
const collectElements = (svgTag, tagName) => {
    const elts = [];
    const collectElementsInner = domElement => {
        if ((domElement.localName === tagName || typeof tagName === 'undefined') && domElement.getAttribute) {
            elts.push(domElement);
        }
        for (let i = 0; i < domElement.childNodes.length; i++) {
            collectElementsInner(domElement.childNodes[i]);
        }
    };
    collectElementsInner(svgTag);
    return elts;
};

/**
 * Fix SVGs to comply with SVG spec. Scratch 2 defaults to x2 = 0 when x2 is missing, but
 * SVG defaults to x2 = 1 when missing.
 * @param {SVGSVGElement} svgTag the SVG tag to apply the transformation to
 */
const transformGradients = svgTag => {
    const linearGradientElements = collectElements(svgTag, 'linearGradient');

    // For each gradient element, supply x2 if necessary.
    for (const gradientElement of linearGradientElements) {
        if (!gradientElement.getAttribute('x2')) {
            gradientElement.setAttribute('x2', '0');
        }
    }
};

/**
 * Fix SVGs to match appearance in Scratch 2, which used nearest neighbor scaling for bitmaps
 * within SVGs.
 * @param {SVGSVGElement} svgTag the SVG tag to apply the transformation to
 */
const transformImages = svgTag => {
    const imageElements = collectElements(svgTag, 'image');

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
};

/**
 * Transforms an SVG's text elements for Scratch 2.0 quirks.
 * These quirks include:
 * 1. `x` and `y` properties are removed/ignored.
 * 2. Alignment is set to `text-before-edge`.
 * 3. Line-breaks are converted to explicit <tspan> elements.
 * 4. Any required fonts are injected.
 * @param {SVGSVGElement} svgTag the SVG tag to apply the transformation to
 */
const transformText = svgTag => {
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
    collectText(svgTag);
    convertFonts(svgTag);
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
            const transform = svgTag.createSVGTransform();
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
};

/**
 * Find the largest stroke width in the svg. If a shape has no
 * `stroke` property, it has a stroke-width of 0. If it has a `stroke`,
 * it is by default a stroke-width of 1.
 * This is used to enlarge the computed bounding box, which doesn't take
 * stroke width into account.
 * @param {SVGSVGElement} rootNode The root SVG node to traverse.
 * @return {number} The largest stroke width in the SVG.
 */
const findLargestStrokeWidth = rootNode => {
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
};

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
 * @param {SVGSVGElement} svgTag the SVG tag to apply the transformation to
 */
const transformMeasurements = svgTag => {
    // Append the SVG dom to the document.
    // This allows us to use `getBBox` on the page,
    // which returns the full bounding-box of all drawn SVG
    // elements, similar to how Scratch 2.0 did measurement.
    const svgSpot = document.createElement('span');
    // Since we're adding user-provided SVG to document.body,
    // sanitizing is required. This should not affect bounding box calculation.
    // outerHTML is attribute of Element (and not HTMLElement), so use it instead of
    // calling serializer or toString()
    // NOTE: svgTag remains untouched!
    const rawValue = svgTag.outerHTML;
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
        halfStrokeWidth = findLargestStrokeWidth(svgTag) / 2;
    }
    const width = bbox.width + (halfStrokeWidth * 2);
    const height = bbox.height + (halfStrokeWidth * 2);
    const x = bbox.x - halfStrokeWidth;
    const y = bbox.y - halfStrokeWidth;

    // Set the correct measurements on the SVG tag
    svgTag.setAttribute('width', width);
    svgTag.setAttribute('height', height);
    svgTag.setAttribute('viewBox',
        `${x} ${y} ${width} ${height}`);
};

/**
 * Find all instances of a URL-referenced `stroke` in the svg. In 2.0, all gradient strokes
 * have a round `stroke-linejoin` and `stroke-linecap`... for some reason.
 * @param {SVGSVGElement} svgTag the SVG tag to apply the transformation to
 */
const setGradientStrokeRoundedness = svgTag => {
    const elements = collectElements(svgTag);

    for (const elt of elements) {
        if (!elt.style) continue;
        const stroke = elt.style.stroke || elt.getAttribute('stroke');
        if (stroke && stroke.match(/^url\(#.*\)$/)) {
            elt.style['stroke-linejoin'] = 'round';
            elt.style['stroke-linecap'] = 'round';
        }
    }
};

/**
 * In-place, convert passed SVG to something consistent that will be rendered the way we want them to be.
 * @param {SVGSvgElement} svgTag root SVG node to operate upon
 * @param {boolean} [fromVersion2] True if we should perform conversion from version 2 to version 3 svg.
 */
const normalizeSvg = (svgTag, fromVersion2) => {
    if (fromVersion2) {
        // Fix gradients. Scratch 2 exports no x2 when x2 = 0, but
        // SVG default is that x2 is 1. This must be done before
        // transformStrokeWidths since transformStrokeWidths affects
        // gradients.
        transformGradients(svgTag);
    }
    transformStrokeWidths(svgTag, window);
    transformImages(svgTag);
    if (fromVersion2) {
        // Transform all text elements.
        transformText(svgTag);
        // Transform measurements.
        transformMeasurements(svgTag);
        // Fix stroke roundedness.
        setGradientStrokeRoundedness(svgTag);
    } else if (!svgTag.getAttribute('viewBox')) {
        // Renderer expects a view box.
        transformMeasurements(svgTag);
    } else if (!svgTag.getAttribute('width') || !svgTag.getAttribute('height')) {
        svgTag.setAttribute('width', svgTag.viewBox.baseVal.width);
        svgTag.setAttribute('height', svgTag.viewBox.baseVal.height);
    }
};

/**
 * Load an SVG string and normalize it. All the steps before drawing/measuring.
 * Currently, this will normalize stroke widths (see transform-applier.js) and render all embedded images pixelated.
 * The returned SVG will be guaranteed to always have a `width`, `height` and `viewBox`.
 * In addition, if the `fromVersion2` parameter is `true`, several "quirks-mode" transformations will be applied which
 * mimic Scratch 2.0's SVG rendering.
 * @param {!string} svgString String of SVG data to draw in quirks-mode.
 * @param {boolean} [fromVersion2] True if we should perform conversion from version 2 to version 3 svg.
 * @return {SVGSVGElement} The normalized SVG element.
 */
const loadSvgString = (svgString, fromVersion2) => {
    // Parse string into SVG XML.
    const parser = new DOMParser();
    svgString = fixupSvgString(svgString);
    const svgDom = parser.parseFromString(svgString, 'text/xml');
    if (svgDom.childNodes.length < 1 ||
        svgDom.documentElement.localName !== 'svg') {
        throw new Error('Document does not appear to be SVG.');
    }
    const svgTag = svgDom.documentElement;
    normalizeSvg(svgTag, fromVersion2);
    return svgTag;
};

module.exports = loadSvgString;
