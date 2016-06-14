var RenderWebGL = require('./RenderWebGL');

/**
 * Export and bind to `window`
 */
module.exports = RenderWebGL;
if (typeof self !== 'undefined') self.RenderWebGL = RenderWebGL;
