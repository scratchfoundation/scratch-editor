const importBitmap = require('./bitmap-importer');
const SVGRenderer = require('./svg-renderer');
// /**
//  * Export for NPM & Node.js
//  * @type {RenderWebGL}
//  */
module.exports = {
    SVGRenderer: SVGRenderer,
    importBitmap: importBitmap
};
