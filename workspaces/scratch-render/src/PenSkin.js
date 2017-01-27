const twgl = require('twgl.js');

const RenderConstants = require('./RenderConstants');
const Skin = require('./Skin');


/**
 * Attributes to use when drawing with the pen
 * @typedef {object} PenAttributes
 * @property {number} [diameter] - The size (diameter) of the pen.
 * @property {number[]} [color4f] - The pen color as an array of [r,g,b,a], each component in the range [0,1].
 */

/**
 * The pen attributes to use when unspecified.
 * @type {PenAttributes}
 */
const DefaultPenAttributes = {
    color4f: [0, 0, 1, 1],
    diameter: 1
};


class PenSkin extends Skin {
    /**
     * Create a Skin which implements a Scratch pen layer.
     * @param {int} id - The unique ID for this Skin.
     * @param {RenderWebGL} renderer - The renderer which will use this Skin.
     */
    constructor (id, renderer) {
        super(id);

        /** @type {RenderWebGL} */
        this._renderer = renderer;

        /** @type {HTMLCanvasElement} */
        this._canvas = document.createElement('canvas');

        /** @type {boolean} */
        this._canvasDirty = false;

        /** @type {WebGLTexture} */
        this._texture = null;

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
     * @return {[number,number]} the "native" size, in texels, of this skin.
     */
    get size () {
        return [this._canvas.width, this._canvas.height];
    }

    /**
     * @return {WebGLTexture} The GL texture representation of this skin when drawing at the given size.
     * @param {int} pixelsWide - The width that the skin will be rendered at, in GPU pixels.
     * @param {int} pixelsTall - The height that the skin will be rendered at, in GPU pixels.
     */
    // eslint-disable-next-line no-unused-vars
    getTexture (pixelsWide, pixelsTall) {
        if (this._canvasDirty) {
            this._canvasDirty = false;

            const gl = this._renderer.gl;
            gl.bindTexture(gl.TEXTURE_2D, this._texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this._canvas);
        }

        return this._texture;
    }

    /**
     * Clear the pen layer.
     */
    clear () {
        const ctx = this._canvas.getContext('2d');
        ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
        this._canvasDirty = true;
    }

    /**
     * Draw a point on the pen layer.
     * @param {PenAttributes} penAttributes - how the point should be drawn.
     * @param {number} x - the X coordinate of the point to draw.
     * @param {number} y - the Y coordinate of the point to draw.
     */
    drawPoint (penAttributes, x, y) {
        // Canvas renders a zero-length line as two end-caps back-to-back, which is what we want.
        this.drawLine(penAttributes, x, y, x, y);
    }

    /**
     * Draw a point on the pen layer.
     * @param {PenAttributes} penAttributes - how the line should be drawn.
     * @param {number} x0 - the X coordinate of the beginning of the line.
     * @param {number} y0 - the Y coordinate of the beginning of the line.
     * @param {number} x1 - the X coordinate of the end of the line.
     * @param {number} y1 - the Y coordinate of the end of the line.
     */
    drawLine (penAttributes, x0, y0, x1, y1) {
        const ctx = this._canvas.getContext('2d');
        this._setAttributes(ctx, penAttributes);
        ctx.beginPath();
        ctx.moveTo(this._rotationCenter[0] + x0, this._rotationCenter[1] - y0);
        ctx.lineTo(this._rotationCenter[0] + x1, this._rotationCenter[1] - y1);
        ctx.stroke();
        this._canvasDirty = true;
    }

    /**
     * Stamp an image onto the pen layer.
     * @param {HTMLCanvasElement|HTMLImageElement|HTMLVideoElement} stampElement - the element to use as the stamp.
     * @param {number} x - the X coordinate of the stamp to draw.
     * @param {number} y - the Y coordinate of the stamp to draw.
     */
    drawStamp (stampElement, x, y) {
        const ctx = this._canvas.getContext('2d');
        ctx.drawImage(stampElement, this._rotationCenter[0] + x, this._rotationCenter[1] - y);
        this._canvasDirty = true;
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
     * @param {[int,int]} canvasSize - the new width and height for the canvas.
     * @private
     */
    _setCanvasSize (canvasSize) {
        const [width, height] = canvasSize;

        const gl = this._renderer.gl;
        this._canvas.width = width;
        this._canvas.height = height;
        this._rotationCenter[0] = width / 2;
        this._rotationCenter[1] = height / 2;
        this._texture = twgl.createTexture(
            gl,
            {
                auto: true,
                mag: gl.NEAREST,
                min: gl.NEAREST,
                wrap: gl.CLAMP_TO_EDGE,
                src: this._canvas
            }
        );
        this._canvasDirty = true;
    }

    /**
     * Set context state to match provided pen attributes.
     * @param {CanvasRenderingContext2D} context - the canvas rendering context to be modified.
     * @param {PenAttributes} penAttributes - the pen attributes to be used.
     * @private
     */
    _setAttributes (context, penAttributes) {
        penAttributes = penAttributes || DefaultPenAttributes;
        const color4f = penAttributes.color4f || DefaultPenAttributes.color4f;
        const diameter = penAttributes.diameter || DefaultPenAttributes.diameter;

        const r = Math.round(color4f[0] * 255);
        const g = Math.round(color4f[1] * 255);
        const b = Math.round(color4f[2] * 255);
        const a = Math.round(color4f[3]);   // Alpha is 0 to 1 (not 0 to 255 like r,g,b)

        context.strokeStyle = `rgba(${r},${g},${b},${a})`;
        context.lineCap = 'round';
        context.lineWidth = diameter;
    }
}

module.exports = PenSkin;
