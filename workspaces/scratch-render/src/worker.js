var WorkerRemote = require('./WorkerRemote');

module.exports = WorkerRemote;
if (typeof self !== 'undefined') self.RenderWebGLRemote = WorkerRemote;
