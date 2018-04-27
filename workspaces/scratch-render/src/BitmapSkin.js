const twgl = require('twgl.js');

const Skin = require('./Skin');

class BitmapSkin extends Skin {
    /**
     * Create a new Bitmap Skin.
     * @extends Skin
     * @param {!int} id - The ID for this Skin.
     * @param {!RenderWebGL} renderer - The renderer which will use this skin.
     */
    constructor (id, renderer) {
        super(id);

        /** @type {!int} */
        this._costumeResolution = 1;

        /** @type {!RenderWebGL} */
        this._renderer = renderer;

        /** @type {WebGLTexture} */
        this._texture = null;

        /** @type {Array<int>} */
        this._textureSize = [0, 0];
    }

    /**
     * Dispose of this object. Do not use it after calling this method.
     */
    dispose () {
        if (this._texture) {
            this._renderer.gl.deleteTexture(this._texture);
            this._texture = null;
        }
        super.dispose();
    }

    /**
     * @returns {boolean} true for a raster-style skin (like a BitmapSkin), false for vector-style (like SVGSkin).
     */
    get isRaster () {
        return true;
    }

    /**
     * @return {Array<number>} the "native" size, in texels, of this skin.
     */
    get size () {
        return [this._textureSize[0] / this._costumeResolution, this._textureSize[1] / this._costumeResolution];
    }

    /**
     * @param {Array<number>} scale - The scaling factors to be used.
     * @return {WebGLTexture} The GL texture representation of this skin when drawing at the given scale.
     */
    // eslint-disable-next-line no-unused-vars
    getTexture (scale) {
        return this._texture;
    }

    /**
     * Set the contents of this skin to a snapshot of the provided bitmap data.
     * @param {ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement} bitmapData - new contents for this skin.
     * @param {int} [costumeResolution=1] - The resolution to use for this bitmap.
     * @param {Array<number>} [rotationCenter] - Optional rotation center for the bitmap. If not supplied, it will be
     * calculated from the bounding box
     * @fires Skin.event:WasAltered
     */
    setBitmap (bitmapData, costumeResolution, rotationCenter) {
        const gl = this._renderer.gl;

        if (this._texture) {
            gl.bindTexture(gl.TEXTURE_2D, this._texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmapData);
            this._silhouette.update(bitmapData);
        } else {
            // TODO: mipmaps?
            const textureOptions = {
                auto: true,
                wrap: gl.CLAMP_TO_EDGE,
                src: bitmapData
            };

            this._texture = twgl.createTexture(gl, textureOptions);
            this._silhouette.update(bitmapData);
        }

        // Do these last in case any of the above throws an exception
        this._costumeResolution = costumeResolution || 2;
        this._textureSize = BitmapSkin._getBitmapSize(bitmapData);

        if (typeof rotationCenter === 'undefined') rotationCenter = this.calculateRotationCenter();
        this.setRotationCenter.apply(this, rotationCenter);

        this.emit(Skin.Events.WasAltered);
    }

    /**
     * @param {ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement} bitmapData - bitmap data to inspect.
     * @returns {Array<int>} the width and height of the bitmap data, in pixels.
     * @private
     */
    static _getBitmapSize (bitmapData) {
        if (bitmapData instanceof HTMLImageElement) {
            return [bitmapData.naturalWidth || bitmapData.width, bitmapData.naturalHeight || bitmapData.height];
        }

        if (bitmapData instanceof HTMLVideoElement) {
            return [bitmapData.videoWidth || bitmapData.width, bitmapData.videoHeight || bitmapData.height];
        }

        // ImageData or HTMLCanvasElement
        return [bitmapData.width, bitmapData.height];
    }

}

module.exports = BitmapSkin;
