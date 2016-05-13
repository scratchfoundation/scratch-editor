var EventEmitter = require('events');
var twgl = require('twgl.js');
var util = require('util');

/**
 * Create a renderer for drawing Scratch sprites to a canvas using WebGL.
 * Optionally, specify the logical and/or physical size of the Scratch stage.
 * Logical coordinates will default to Scratch 2.0 values if unspecified.
 * Unspecified physical size will be calculated from the logical size.
 * @see setStageSize
 * @see resize
 * @param {canvas} canvas The canvas to draw onto.
 * @param {number} [xLeft=-240] The x-coordinate of the left edge.
 * @param {number} [xRight=240] The x-coordinate of the right edge.
 * @param {number} [yBottom=-180] The y-coordinate of the bottom edge.
 * @param {number} [yTop=180] The y-coordinate of the top edge.
 * @param {int} [pixelsWide] The desired width in device-independent pixels.
 * @param {int} [pixelsTall] The desired height in device-independent pixels.
 * @constructor
 */
function RenderWebGL(
    canvas, xLeft, xRight, yBottom, yTop, pixelsWide, pixelsTall) {

    // Bind event emitter and runtime to VM instance
    EventEmitter.call(this);

    this._gl = twgl.getWebGLContext(canvas);
    this._drawables = {};
    this._uniforms = {};

    this._createPrograms();
    this._createGeometry();

    this.setStageSize(
        xLeft || -240, xRight || 240, yBottom || -180, yTop || 180);
    this.resize(
        pixelsWide || Math.abs(this._xRight - this._xLeft),
        pixelsTall || Math.abs(this._yTop - this._yBottom));
}

/**
 * Inherit from EventEmitter
 */
util.inherits(RenderWebGL, EventEmitter);

/**
 * Export and bind to `window`
 */
module.exports = RenderWebGL;
if (typeof window !== 'undefined') window.RenderWebGL = module.exports;

/**
 * Set logical size of the stage in Scratch units.
 * @param {number} xLeft The left edge's x-coordinate. Scratch 2 uses -240.
 * @param {number} xRight The right edge's x-coordinate. Scratch 2 uses 240.
 * @param {number} yBottom The bottom edge's y-coordinate. Scratch 2 uses -180.
 * @param {number} yTop The top edge's y-coordinate. Scratch 2 uses 180.
 */
RenderWebGL.prototype.setStageSize = function (xLeft, xRight, yBottom, yTop) {
    this._xLeft = xLeft;
    this._xRight = xRight;
    this._yBottom = yBottom;
    this._yTop = yTop;
    this._uniforms.u_projection =
        twgl.m4.ortho(xLeft, xRight, yBottom, yTop, -1, 1);
};

/**
 * Set the physical size of the stage in device-independent pixels.
 * This will be multiplied by the device's pixel ratio on high-DPI displays.
 * @param {int} pixelsWide The desired width in device-independent pixels.
 * @param {int} pixelsTall The desired height in device-independent pixels.
 */
RenderWebGL.prototype.resize = function (pixelsWide, pixelsTall) {
    var pixelRatio = window.devicePixelRatio || 1;
    this._gl.canvas.width = pixelsWide * pixelRatio;
    this._gl.canvas.height = pixelsTall * pixelRatio;
};

/**
 * Draw all current drawables and present the frame on the canvas.
 */
RenderWebGL.prototype.draw = function () {
    var gl = this._gl;

    gl.viewport(0, 0, gl.canvas.clientWidth, gl.canvas.clientHeight);
    gl.clearColor(1, 0, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this._programInfo.program);
    twgl.setBuffersAndAttributes(gl, this._programInfo, this._bufferInfo);

    twgl.setUniforms(this._programInfo, this._uniforms);

    for (var id in this._drawables) {
        if (this._drawables.hasOwnProperty(id)) {
            var drawable = this._drawables[id];
            twgl.setUniforms(this._programInfo, drawable);
            twgl.drawBufferInfo(gl, gl.TRIANGLES, this._bufferInfo);
        }
    }
};

/**
 * Build shaders.
 * @private
 */
RenderWebGL.prototype._createPrograms = function () {
    var vsText = require('./shaders/sprite.vert');
    var fsText = require('./shaders/sprite.frag');

    this._programInfo = twgl.createProgramInfo(this._gl, [vsText, fsText]);
};

/**
 * Build geometry (vertex and index) buffers.
 * @private
 */
RenderWebGL.prototype._createGeometry = function () {
    var quad = {
        position: [
            -0.5, -0.5, 0,
            0.5, -0.5, 0,
            -0.5, 0.5, 0,
            -0.5, 0.5, 0,
            0.5, -0.5, 0,
            0.5, 0.5, 0
        ]
    };
    this._bufferInfo = twgl.createBufferInfoFromArrays(this._gl, quad);
};
