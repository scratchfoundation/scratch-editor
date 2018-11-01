const SVGRenderer = require('./svg-renderer');
const BitmapAdapter = require('./bitmap-adapter');
const inlineSvgFonts = require('./font-inliner');
const SvgElement = require('./svg-element');
const convertFonts = require('./font-converter');
// /**
//  * Export for NPM & Node.js
//  * @type {RenderWebGL}
//  */
module.exports = {
    BitmapAdapter: BitmapAdapter,
    convertFonts: convertFonts,
    inlineSvgFonts: inlineSvgFonts,
    SvgElement: SvgElement,
    SVGRenderer: SVGRenderer
};
