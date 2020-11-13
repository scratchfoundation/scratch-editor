const twgl = require('twgl.js');

const RenderConstants = require('./RenderConstants');
const Skin = require('./Skin');

const ShaderManager = require('./ShaderManager');

/**
 * Attributes to use when drawing with the pen
 * @typedef {object} PenSkin#PenAttributes
 * @property {number} [diameter] - The size (diameter) of the pen.
 * @property {Array<number>} [color4f] - The pen color as an array of [r,g,b,a], each component in the range [0,1].
 */

/**
 * The pen attributes to use when unspecified.
 * @type {PenSkin#PenAttributes}
 * @memberof PenSkin
 * @private
 * @const
 */
const DefaultPenAttributes = {
    color4f: [0, 0, 1, 1],
    diameter: 1
};

/**
 * Reused memory location for storing a premultiplied pen color.
 * @type {FloatArray}
 */
const __premultipliedColor = [0, 0, 0, 0];

class PenSkin extends Skin {
    /**
     * Create a Skin which implements a Scratch pen layer.
     * @param {int} id - The unique ID for this Skin.
     * @param {RenderWebGL} renderer - The renderer which will use this Skin.
     * @extends Skin
     * @listens RenderWebGL#event:NativeSizeChanged
     */
    constructor (id, renderer) {
        super(id);

        /**
         * @private
         * @type {RenderWebGL}
         */
        this._renderer = renderer;

        /** @type {Array<number>} */
        this._size = null;

        /** @type {WebGLFramebuffer} */
        this._framebuffer = null;

        /** @type {boolean} */
        this._silhouetteDirty = false;

        /** @type {Uint8Array} */
        this._silhouettePixels = null;

        /** @type {ImageData} */
        this._silhouetteImageData = null;

        /** @type {object} */
        this._lineOnBufferDrawRegionId = {
            enter: () => this._enterDrawLineOnBuffer(),
            exit: () => this._exitDrawLineOnBuffer()
        };

        /** @type {object} */
        this._usePenBufferDrawRegionId = {
            enter: () => this._enterUsePenBuffer(),
            exit: () => this._exitUsePenBuffer()
        };

        /** @type {twgl.BufferInfo} */
        this._lineBufferInfo = twgl.createBufferInfoFromArrays(this._renderer.gl, {
            a_position: {
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
        });

        const NO_EFFECTS = 0;
        /** @type {twgl.ProgramInfo} */
        this._lineShader = this._renderer._shaderManager.getShader(ShaderManager.DRAW_MODE.line, NO_EFFECTS);

        this.onNativeSizeChanged = this.onNativeSizeChanged.bind(this);
        this._renderer.on(RenderConstants.Events.NativeSizeChanged, this.onNativeSizeChanged);

        this._setCanvasSize(renderer.getNativeSize());
    }

    /**
     * Dispose of this object. Do not use it after calling this method.
     */
    dispose () {
        this._renderer.removeListener(RenderConstants.Events.NativeSizeChanged, this.onNativeSizeChanged);
        this._renderer.gl.deleteTexture(this._texture);
        this._texture = null;
        super.dispose();
    }

    /**
     * @return {Array<number>} the "native" size, in texels, of this skin. [width, height]
     */
    get size () {
        return this._size;
    }

    useNearest (scale) {
        // Use nearest-neighbor interpolation when scaling up the pen skin-- this matches Scratch 2.0.
        // When scaling it down, use linear interpolation to avoid giving pen lines a "dashed" appearance.
        return Math.max(scale[0], scale[1]) >= 100;
    }

    /**
     * @param {Array<number>} scale The X and Y scaling factors to be used, as percentages of this skin's "native" size.
     * @return {WebGLTexture} The GL texture representation of this skin when drawing at the given size.
     */
    // eslint-disable-next-line no-unused-vars
    getTexture (scale) {
        return this._texture;
    }

    /**
     * Clear the pen layer.
     */
    clear () {
        this._renderer.enterDrawRegion(this._usePenBufferDrawRegionId);

        /* Reset framebuffer to transparent black */
        const gl = this._renderer.gl;
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        this._silhouetteDirty = true;
    }

    /**
     * Draw a point on the pen layer.
     * @param {PenAttributes} penAttributes - how the point should be drawn.
     * @param {number} x - the X coordinate of the point to draw.
     * @param {number} y - the Y coordinate of the point to draw.
     */
    drawPoint (penAttributes, x, y) {
        this.drawLine(penAttributes, x, y, x, y);
    }

    /**
     * Draw a line on the pen layer.
     * @param {PenAttributes} penAttributes - how the line should be drawn.
     * @param {number} x0 - the X coordinate of the beginning of the line.
     * @param {number} y0 - the Y coordinate of the beginning of the line.
     * @param {number} x1 - the X coordinate of the end of the line.
     * @param {number} y1 - the Y coordinate of the end of the line.
     */
    drawLine (penAttributes, x0, y0, x1, y1) {
        // For compatibility with Scratch 2.0, offset pen lines of width 1 and 3 so they're pixel-aligned.
        // See https://github.com/LLK/scratch-render/pull/314
        const diameter = penAttributes.diameter || DefaultPenAttributes.diameter;
        const offset = (diameter === 1 || diameter === 3) ? 0.5 : 0;

        this._drawLineOnBuffer(
            penAttributes,
            x0 + offset, y0 + offset,
            x1 + offset, y1 + offset
        );

        this._silhouetteDirty = true;
    }

    /**
     * Prepare to draw lines in the _lineOnBufferDrawRegionId region.
     */
    _enterDrawLineOnBuffer () {
        const gl = this._renderer.gl;

        twgl.bindFramebufferInfo(gl, this._framebuffer);

        gl.viewport(0, 0, this._size[0], this._size[1]);

        const currentShader = this._lineShader;
        gl.useProgram(currentShader.program);
        twgl.setBuffersAndAttributes(gl, currentShader, this._lineBufferInfo);

        const uniforms = {
            u_skin: this._texture,
            u_stageSize: this._size
        };

        twgl.setUniforms(currentShader, uniforms);
    }

    /**
     * Return to a base state from _lineOnBufferDrawRegionId.
     */
    _exitDrawLineOnBuffer () {
        const gl = this._renderer.gl;

        twgl.bindFramebufferInfo(gl, null);
    }

    /**
     * Prepare to do things with this PenSkin's framebuffer
     */
    _enterUsePenBuffer () {
        twgl.bindFramebufferInfo(this._renderer.gl, this._framebuffer);
    }

    /**
     * Return to a base state
     */
    _exitUsePenBuffer () {
        twgl.bindFramebufferInfo(this._renderer.gl, null);
    }

    /**
     * Draw a line on the framebuffer.
     * Note that the point coordinates are in the following coordinate space:
     * +y is down, (0, 0) is the center, and the coords range from (-width / 2, -height / 2) to (height / 2, width / 2).
     * @param {PenAttributes} penAttributes - how the line should be drawn.
     * @param {number} x0 - the X coordinate of the beginning of the line.
     * @param {number} y0 - the Y coordinate of the beginning of the line.
     * @param {number} x1 - the X coordinate of the end of the line.
     * @param {number} y1 - the Y coordinate of the end of the line.
     */
    _drawLineOnBuffer (penAttributes, x0, y0, x1, y1) {
        const gl = this._renderer.gl;

        const currentShader = this._lineShader;

        this._renderer.enterDrawRegion(this._lineOnBufferDrawRegionId);

        // Premultiply pen color by pen transparency
        const penColor = penAttributes.color4f || DefaultPenAttributes.color4f;
        __premultipliedColor[0] = penColor[0] * penColor[3];
        __premultipliedColor[1] = penColor[1] * penColor[3];
        __premultipliedColor[2] = penColor[2] * penColor[3];
        __premultipliedColor[3] = penColor[3];

        // Fun fact: Doing this calculation in the shader has the potential to overflow the floating-point range.
        // 'mediump' precision is only required to have a range up to 2^14 (16384), so any lines longer than 2^7 (128)
        // can overflow that, because you're squaring the operands, and they could end up as "infinity".
        // Even GLSL's `length` function won't save us here:
        // https://asawicki.info/news_1596_watch_out_for_reduced_precision_normalizelength_in_opengl_es
        const lineDiffX = x1 - x0;
        const lineDiffY = y1 - y0;
        const lineLength = Math.sqrt((lineDiffX * lineDiffX) + (lineDiffY * lineDiffY));

        const uniforms = {
            u_lineColor: __premultipliedColor,
            u_lineThickness: penAttributes.diameter || DefaultPenAttributes.diameter,
            u_lineLength: lineLength,
            u_penPoints: [x0, -y0, lineDiffX, -lineDiffY]
        };

        twgl.setUniforms(currentShader, uniforms);

        twgl.drawBufferInfo(gl, this._lineBufferInfo, gl.TRIANGLES);

        this._silhouetteDirty = true;
    }

    /**
     * React to a change in the renderer's native size.
     * @param {object} event - The change event.
     */
    onNativeSizeChanged (event) {
        this._setCanvasSize(event.newSize);
    }

    /**
     * Set the size of the pen canvas.
     * @param {Array<int>} canvasSize - the new width and height for the canvas.
     * @private
     */
    _setCanvasSize (canvasSize) {
        const [width, height] = canvasSize;

        this._size = canvasSize;
        this._rotationCenter[0] = width / 2;
        this._rotationCenter[1] = height / 2;

        const gl = this._renderer.gl;

        this._texture = twgl.createTexture(
            gl,
            {
                mag: gl.NEAREST,
                min: gl.NEAREST,
                wrap: gl.CLAMP_TO_EDGE,
                width,
                height
            }
        );

        const attachments = [
            {
                format: gl.RGBA,
                attachment: this._texture
            }
        ];
        if (this._framebuffer) {
            twgl.resizeFramebufferInfo(gl, this._framebuffer, attachments, width, height);
        } else {
            this._framebuffer = twgl.createFramebufferInfo(gl, attachments, width, height);
        }

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        this._silhouettePixels = new Uint8Array(Math.floor(width * height * 4));
        this._silhouetteImageData = new ImageData(width, height);

        this._silhouetteDirty = true;
    }

    /**
     * If there have been pen operations that have dirtied the canvas, update
     * now before someone wants to use our silhouette.
     */
    updateSilhouette () {
        if (this._silhouetteDirty) {
            this._renderer.enterDrawRegion(this._usePenBufferDrawRegionId);
            // Sample the framebuffer's pixels into the silhouette instance
            const gl = this._renderer.gl;
            gl.readPixels(
                0, 0,
                this._size[0], this._size[1],
                gl.RGBA, gl.UNSIGNED_BYTE, this._silhouettePixels
            );

            this._silhouetteImageData.data.set(this._silhouettePixels);
            this._silhouette.update(this._silhouetteImageData, true /* isPremultiplied */);

            this._silhouetteDirty = false;
        }
    }
}

module.exports = PenSkin;
