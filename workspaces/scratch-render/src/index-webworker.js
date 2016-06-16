require('babel-polyfill');

var RenderWebGLWorker = require('./RenderWebGLWorker');

/**
 * Export for use in a Web Worker
 */
self.RenderWebGLWorker = RenderWebGLWorker;
