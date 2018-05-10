const importBitmap = require('./bitmap-importer');
const SVGRenderer = require('./svg-renderer');
const {inlineSvgFonts} = require('./font-inliner');
const convertFonts = require('./font-converter');
// /**
//  * Export for NPM & Node.js
//  * @type {RenderWebGL}
//  */
module.exports = {
    convertFonts: convertFonts,
    inlineSvgFonts: inlineSvgFonts,
    importBitmap: importBitmap,
    SVGRenderer: SVGRenderer
};
