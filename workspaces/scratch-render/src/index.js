var RenderWebGL = require('./RenderWebGL');

/**
 * Export and bind to `window`
 */
module.exports = RenderWebGL;
if (typeof window !== 'undefined') window.RenderWebGL = RenderWebGL;
