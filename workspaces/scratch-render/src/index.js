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
 * Maximum touch size for a picking check.
 * TODO: Figure out a reasonable max size. Maybe this should be configurable?
 * @type {int[]}
 */
RenderWebGL.MAX_TOUCH_SIZE = [3, 3];

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
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor.apply(gl, this._backgroundColor);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);

    this._drawThese(
        this._drawables, Drawable.DRAW_MODE.default, this._projection);
};

/**
 * Draw all Drawables, with the possible exception of
 * @param {int[]} drawables The Drawable IDs to draw, possibly this._drawables.
 * @param {Drawable.DRAW_MODE} drawMode Draw normally or for picking, etc.
 * @param {module:twgl/m4.Mat4} projection The projection matrix to use.
 * @param {Drawable~idFilterFunc} [filter] An optional filter function.
 * @private
 */
RenderWebGL.prototype._drawThese = function(
    drawables, drawMode, projection, filter) {

    var gl = this._gl;
    var currentShader = null;

    var numDrawables = drawables.length;
    for (var drawableIndex = 0; drawableIndex < numDrawables; ++drawableIndex) {
        var drawableID = drawables[drawableIndex];

        // If we have a filter, check whether the ID fails
        if (filter && !filter(drawableID)) continue;

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

    this._pickBufferInfo = twgl.createFramebufferInfo(
        gl, attachments,
        RenderWebGL.MAX_TOUCH_SIZE[0], RenderWebGL.MAX_TOUCH_SIZE[1]);
};

/**
 * Detect which sprite, if any, is at the given location.
 * @param {int} centerX The client x coordinate of the picking location.
 * @param {int} centerY The client y coordinate of the picking location.
 * @param {int} touchWidth The client width of the touch event (optional).
 * @param {int} touchHeight The client height of the touch event (optional).
 * @returns {int} The ID of the topmost Drawable under the picking location, or
 * Drawable.NONE if there is no Drawable at that location.
 */
RenderWebGL.prototype.pick = function (
    centerX, centerY, touchWidth, touchHeight) {
    var gl = this._gl;

    touchWidth = touchWidth || 1;
    touchHeight = touchHeight || 1;

    var clientToGLX = gl.canvas.width / gl.canvas.clientWidth;
    var clientToGLY = gl.canvas.height / gl.canvas.clientHeight;

    centerX *= clientToGLX;
    centerY *= clientToGLY;
    touchWidth *= clientToGLX;
    touchHeight *= clientToGLY;

    touchWidth =
        Math.max(1, Math.min(touchWidth, RenderWebGL.MAX_TOUCH_SIZE[0]));
    touchHeight =
        Math.max(1, Math.min(touchHeight, RenderWebGL.MAX_TOUCH_SIZE[1]));

    var pixelLeft = Math.floor(centerX - Math.floor(touchWidth / 2) + 0.5);
    var pixelRight = Math.floor(centerX + Math.ceil(touchWidth / 2) + 0.5);
    var pixelTop = Math.floor(centerY - Math.floor(touchHeight / 2) + 0.5);
    var pixelBottom = Math.floor(centerY + Math.ceil(touchHeight / 2) + 0.5);

    twgl.bindFramebufferInfo(gl, this._pickBufferInfo);
    gl.viewport(0, 0, touchWidth, touchHeight);

    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND); // TODO: track when a costume has partial transparency?
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.STENCIL_TEST);

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

    this._drawThese(this._drawables, Drawable.DRAW_MODE.pick, projection);

    var pixels = new Uint8Array(touchWidth * touchHeight * 4);
    gl.readPixels(
        0, 0, touchWidth, touchHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    // Uncomment this and make a canvas with id="pick-image" to debug picking
    /*
    var pickImage = document.getElementById('pick-image');
    pickImage.width = touchWidth;
    pickImage.height = touchHeight;
    var context = pickImage.getContext('2d');
    var imageData = context.getImageData(0, 0, touchWidth, touchHeight);
    for (var i = 0, bytes = pixels.length; i < bytes; ++i) {
        imageData.data[i] = pixels[i];
    }
    context.putImageData(imageData, 0, 0);
    */

    var hits = {};
    for (var pixelBase = 0; pixelBase < pixels.length; pixelBase += 4) {
        var pixelID = Drawable.color4ubToID(
            pixels[pixelBase],
            pixels[pixelBase + 1],
            pixels[pixelBase + 2],
            pixels[pixelBase + 3]);
        hits[pixelID] = (hits[pixelID] || 0) + 1;
    }

    // Bias toward selecting anything over nothing
    hits[Drawable.NONE] = 0;

    var hit = Drawable.NONE;
    for (var hitID in hits) {
        if (hits.hasOwnProperty(hitID) && (hits[hitID] > hits[hit])) {
            hit = hitID;
        }
    }

    return hit | 0;
};
