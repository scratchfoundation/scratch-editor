var EventEmitter = require('events');
var twgl = require('twgl.js');
var util = require('util');

var Drawable = require('./drawable');

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

    // TODO: remove?
    twgl.setDefaults({crossOrigin: true});

    this._gl = twgl.getWebGLContext(canvas);
    this._drawables = [];
    this._projection = twgl.m4.identity();

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
    this._projection = twgl.m4.ortho(xLeft, xRight, yBottom, yTop, -1, 1);
    Drawable.dirtyAllTransforms();
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

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    gl.useProgram(this._programInfo.program);
    twgl.setBuffersAndAttributes(gl, this._programInfo, this._bufferInfo);

    var numDrawables = this._drawables.length;
    for (var drawableIndex = 0; drawableIndex < numDrawables; ++drawableIndex) {
        var drawableID = this._drawables[drawableIndex];
        var drawable = Drawable.getDrawableByID(drawableID);
        twgl.setUniforms(this._programInfo, drawable.getUniforms());
        twgl.drawBufferInfo(gl, gl.TRIANGLES, this._bufferInfo);
    }
};

/**
 * Create a new Drawable and add it to the scene.
 * @returns {int} The ID of the new Drawable.
 */
RenderWebGL.prototype.createDrawable = function () {
    var drawable = new Drawable(this, this._gl);
    var drawableID = drawable.getID();
    this._drawables.push(drawableID);
    return drawableID;
};

/**
 * Destroy a Drawable, removing it from the scene.
 * @param {int} drawableID The ID of the Drawable to remove.
 * @returns {boolean} True iff the drawable was found and removed.
 */
RenderWebGL.prototype.destroyDrawable = function (drawableID) {
    var index = this._drawables.indexOf(drawableID);
    if (index >= 0) {
        Drawable.getDrawableByID(drawableID).dispose();
        this._drawables.splice(index, 1);
        return true;
    }
    return false;
};

RenderWebGL.prototype.setDrawablePosition = function (drawableID, x, y) {
    var drawable = Drawable.getDrawableByID(drawableID);
    if (drawable) {
        drawable.setPosition(x, y);
    }
};

RenderWebGL.prototype.setDrawableDirection = function (drawableID, directionDegrees) {
    var drawable = Drawable.getDrawableByID(drawableID);
    if (drawable) {
        drawable.setDirection(directionDegrees);
    }
};

RenderWebGL.prototype.setDrawableScale = function (drawableID, scalePercent) {
    var drawable = Drawable.getDrawableByID(drawableID);
    if (drawable) {
        drawable.setScale(scalePercent);
    }
};

RenderWebGL.prototype.getProjectionMatrix = function () {
    return this._projection;
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
        a_position: {
            numComponents: 2,
            data: [
                -0.5, -0.5,
                0.5, -0.5,
                -0.5, 0.5,
                -0.5, 0.5,
                0.5, -0.5,
                0.5, 0.5
            ]
        },
        a_texCoord: {
            numComponents: 2,
            data: [
                1, 0,
                0, 0,
                1, 1,
                1, 1,
                0, 0,
                0, 1
            ]
        }
    };
    this._bufferInfo = twgl.createBufferInfoFromArrays(this._gl, quad);
};
