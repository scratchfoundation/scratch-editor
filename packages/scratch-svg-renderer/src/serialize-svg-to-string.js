const inlineSvgFonts = require('./font-inliner');

/**
 * Serialize a given SVG DOM to a string.
 * @param {SVGSVGElement} svgTag The SVG element to serialize.
 * @param {?boolean} shouldInjectFonts True if fonts should be included in the SVG as
 *     base64 data.
 * @returns {string} String representing current SVG data.
 */
const serializeSvgToString = (svgTag, shouldInjectFonts) => {
    const serializer = new XMLSerializer();
    let string = serializer.serializeToString(svgTag);
    if (shouldInjectFonts) {
        string = inlineSvgFonts(string);
    }
    return string;
};

module.exports = serializeSvgToString;
