const SVGRenderer = require('./svg-renderer');
const BitmapAdapter = require('./bitmap-adapter');
const canonicalizeSvgText = require('./canonicalize-svg');
const inlineSvgFonts = require('./font-inliner');
const loadSvgString = require('./load-svg-string');
const sanitizeSvg = require('./sanitize-svg');
const serializeSvgToString = require('./serialize-svg-to-string');
const SvgElement = require('./svg-element');
const convertFonts = require('./font-converter');
// /**
//  * Export for NPM & Node.js
//  * @type {RenderWebGL}
//  */
module.exports = {
    BitmapAdapter: BitmapAdapter,
    canonicalizeSvgText: canonicalizeSvgText,
    convertFonts: convertFonts,
    inlineSvgFonts: inlineSvgFonts,
    loadSvgString: loadSvgString,
    sanitizeSvg: sanitizeSvg,
    serializeSvgToString: serializeSvgToString,
    SvgElement: SvgElement,
    SVGRenderer: SVGRenderer
};
