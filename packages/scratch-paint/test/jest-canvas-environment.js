const Module = require('module');
const {TestEnvironment} = require('jest-environment-jsdom');

class ScratchPaintCanvasEnvironment extends TestEnvironment {
    constructor (config, context) {
        // In this monorepo, jest-environment-jsdom resolves from the workspace root
        // while canvas is installed in packages/scratch-paint. During jsdom startup,
        // require('canvas') is resolved relative to the environment package and fails
        // unless we redirect it to scratch-paint's local canvas install.
        const canvasEntry = require.resolve('canvas');
        const originalResolveFilename = Module._resolveFilename;

        Module._resolveFilename = function (request, parent, isMain, options) {
            if (request === 'canvas') {
                return canvasEntry;
            }
            return originalResolveFilename.call(this, request, parent, isMain, options);
        };

        try {
            super(config, context);
        } finally {
            Module._resolveFilename = originalResolveFilename;
        }
    }
}

module.exports = ScratchPaintCanvasEnvironment;
