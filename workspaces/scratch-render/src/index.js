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

    this._gl = twgl.getWebGLContext(canvas, {alpha: false});
    this._drawables = [];
    this._projection = twgl.m4.identity();

    this._createGeometry();

    this.setBackgroundColor(1, 1, 1, 1);
    this.setStageSize(
        xLeft || -240, xRight || 240, yBottom || -180, yTop || 180);
    this.resize(
        pixelsWide || Math.abs(this._xRight - this._xLeft),
        pixelsTall || Math.abs(this._yTop - this._yBottom));
    this._createQueryBuffers();
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
 * Set the background color for the stage. The stage will be cleared with this
 * color each frame.
 * @param {number} red The red component for the background.
 * @param {number} green The green component for the background.
 * @param {number} blue The blue component for the background.
 * @param {number} alpha The alpha (transparency) component for the background.
 */
RenderWebGL.prototype.setBackgroundColor = function(red, green, blue, alpha) {
    this._backgroundColor = [red, green, blue, alpha];
};

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

    twgl.bindFramebufferInfo(gl, null);
    gl.viewport(0, 0, gl.canvas.clientWidth, gl.canvas.clientHeight);
    gl.clearColor.apply(gl, this._backgroundColor);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);

    this._drawExcept(Drawable.DRAW_MODE.default, null, this._projection);
};

/**
 * Draw all Drawables, with the possible exception of
 * @param {Drawable.DRAW_MODE} drawMode Draw normally or for picking, etc.
 * @param {int} skipID The Drawable to skip, if any.
 * @param {module:twgl/m4.Mat4} projection The projection matrix to use.
 * @private
 */
RenderWebGL.prototype._drawExcept = function(drawMode, skipID, projection) {
    var gl = this._gl;
    var currentShader = null;

    var numDrawables = this._drawables.length;
    for (var drawableIndex = 0; drawableIndex < numDrawables; ++drawableIndex) {
        var drawableID = this._drawables[drawableIndex];
        if (drawableID == skipID) continue;

        var drawable = Drawable.getDrawableByID(drawableID);
        // TODO: check if drawable is inside the viewport before anything else

        var newShader = drawable.getShader(drawMode);
        if (currentShader != newShader) {
            currentShader = newShader;
            gl.useProgram(currentShader.program);
            twgl.setBuffersAndAttributes(gl, currentShader, this._bufferInfo);
            twgl.setUniforms(currentShader, {u_projectionMatrix: projection});
            twgl.setUniforms(currentShader, {u_fudge: window.fudge || 0});
        }

        twgl.setUniforms(currentShader, drawable.getUniforms());

        // TODO: consider moving u_pickColor into Drawable's getUniforms()...
        if (drawMode == Drawable.DRAW_MODE.pick) {
            twgl.setUniforms(currentShader,
                {u_pickColor: Drawable.color4fFromID(drawableID)});
        }

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

/**
 * Update the position, direction, scale, or effect properties of this Drawable.
 * @param {int} drawableID The ID of the Drawable to update.
 * @param {Object.<string,*>} properties The new property values to set.
 */
RenderWebGL.prototype.updateDrawableProperties = function (
    drawableID, properties) {

    var drawable = Drawable.getDrawableByID(drawableID);
    if (drawable) {
        drawable.updateProperties(properties);
    }
};

/**
 * Retrieve the renderer's projection matrix.
 * @returns {module:twgl/m4.Mat4} The projection matrix.
 */
RenderWebGL.prototype.getProjectionMatrix = function () {
    return this._projection;
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

/**
 * Create the frame buffers used for queries such as picking and color-touching.
 * These buffers are fixed in size regardless of the size of the main render
 * target. The fixed size allows (more) consistent behavior across devices and
 * presentation modes.
 * @private
 */
RenderWebGL.prototype._createQueryBuffers = function () {
    var gl = this._gl;
    var attachments = [
        {format: gl.RGBA },
        {format: gl.DEPTH_STENCIL }
    ];

    // TODO: consider larger sizes for multi-sample touch picking
    var pickBufferWidth = 1;
    var pickBufferHeight = 1;

    this._pickBufferInfo = twgl.createFramebufferInfo(
        gl, attachments, pickBufferWidth, pickBufferHeight);
};

/**
 * @param {int} centerX The canvas x coordinate of the picking location.
 * @param {int} centerY The canvas y coordinate of the picking location.
 * @returns {int} The ID of the topmost Drawable under the picking location, or
 * Drawable.NONE if there is no Drawable at that location.
 */
RenderWebGL.prototype.pick = function (centerX, centerY) {
    var gl = this._gl;

    // TODO: consider larger sizes for multi-sample touch picking
    var touchWidth = 1;
    var touchHeight = 1;
    var pixelLeft = centerX - Math.floor(touchWidth / 2);
    var pixelRight = centerX + Math.ceil(touchWidth / 2);
    var pixelTop = centerY - Math.floor(touchHeight / 2);
    var pixelBottom = centerY + Math.ceil(touchHeight / 2);

    twgl.bindFramebufferInfo(gl, this._pickBufferInfo);
    gl.viewport(0, 0, touchWidth, touchHeight);
    gl.disable(gl.BLEND);

    var noneColor = Drawable.color4fFromID(Drawable.NONE);
    gl.clearColor.apply(gl, noneColor);
    gl.clear(gl.COLOR_BUFFER_BIT);

    var widthPerPixel = (this._xRight - this._xLeft) / this._gl.canvas.width;
    var heightPerPixel = (this._yBottom - this._yTop) / this._gl.canvas.height;

    var pickLeft = this._xLeft + pixelLeft * widthPerPixel;
    var pickRight = this._xLeft + pixelRight * widthPerPixel;
    var pickTop = this._yTop + pixelTop * heightPerPixel;
    var pickBottom = this._yTop + pixelBottom * heightPerPixel;

    var projection = twgl.m4.ortho(
        pickLeft, pickRight, pickTop, pickBottom, -1, 1);

    this._drawExcept(Drawable.DRAW_MODE.pick, null, projection);

    var pixels = new Uint8Array(1 * 1 * 4);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    return Drawable.color4ubToID(pixels);
};
