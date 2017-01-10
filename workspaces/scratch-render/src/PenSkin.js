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
     * Draw a point on the pen layer.
     * @param {[number, number]} location - where the point should be drawn.
     * @param {PenAttributes} penAttributes - how the point should be drawn.
     */
    drawPoint (location, penAttributes) {
        // Canvas renders a zero-length line as two end-caps back-to-back, which is what we want.
        this.drawLine(location, location, penAttributes);
    }

    /**
     * Draw a point on the pen layer.
     * @param {[number, number]} location0 - where the line should start.
     * @param {[number, number]} location1 - where the line should end.
     * @param {PenAttributes} penAttributes - how the line should be drawn.
     */
    drawLine (location0, location1, penAttributes) {
        const ctx = this._canvas.getContext('2d');
        this._setAttributes(ctx, penAttributes);
        ctx.moveTo(location0[0] + this._rotationCenter[0], location0[1] + this._rotationCenter[1]);
        ctx.beginPath();
        ctx.lineTo(location1[0] + this._rotationCenter[0], location1[1] + this._rotationCenter[1]);
        ctx.stroke();
        this._canvasDirty = true;
    }

    /**
     * Stamp an image onto the pen layer.
     * @param {[number, number]} location - where the stamp should be drawn.
     * @param {HTMLCanvasElement|HTMLImageElement|HTMLVideoElement} stampElement - the element to use as the stamp.
     */
    drawStamp (location, stampElement) {
        const ctx = this._canvas.getContext('2d');
        ctx.drawImage(stampElement, location[0] + this._rotationCenter[0], location[1] + this._rotationCenter[1]);
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

        const ctx = this._canvas.getContext('2d');
        ctx.strokeStyle = 'red';
        ctx.beginPath();
        ctx.moveTo(-2, 0);
        ctx.lineTo(width - 2, height);
        ctx.stroke();
        ctx.strokeStyle = 'green';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(width + 0, height);
        ctx.stroke();
        ctx.strokeStyle = 'blue';
        ctx.beginPath();
        ctx.moveTo(2, 0);
        ctx.lineTo(width + 2, height);
        ctx.stroke();
        ctx.strokeStyle = 'purple';
        ctx.moveTo(2, height / 10);
        ctx.lineTo(width / 10, height / 5);
        ctx.stroke();
    }

    _setAttributes (context, penAttributes) {
        penAttributes = penAttributes || DefaultPenAttributes;
        const color4f = penAttributes.color4f || DefaultPenAttributes.color4f;
        const diameter = penAttributes.diameter || DefaultPenAttributes.diameter;

        const r = Math.round(color4f[0] * 255);
        const g = Math.round(color4f[1] * 255);
        const b = Math.round(color4f[2] * 255);
        const a = Math.round(color4f[3] * 255);

        context.fillStyle = `rgba(${r},${g},${b},${a})`;
        context.lineCap = 'round';
        context.lineWidth = diameter;
    }
}

module.exports = PenSkin;
