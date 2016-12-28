const twgl = require('twgl.js');

const RenderConstants = require('./RenderConstants');

class Skin {
    /**
     * Create a Skin, which stores and/or generates textures for use in rendering.
     * @param {int} id - The unique ID for this Skin.
     */
    constructor (id) {
        /** @type {int} */
        this._id = id;

        /** @type {Vec3} */
        this._rotationCenter = twgl.v3.create(0, 0);

        /**
         * The uniforms to be used by the vertex and pixel shaders.
         * Some of these are used by other parts of the renderer as well.
         * @type {Object.<string,*>}
         * @private
         */
        this._uniforms = {
            /**
             * The nominal (not necessarily current) size of the current skin.
             * @type {number[]}
             */
            u_skinSize: [0, 0],

            /**
             * The actual WebGL texture object for the skin.
             * @type {WebGLTexture}
             */
            u_skin: null
        };
    }

    /**
     * Dispose of this object. Do not use it after calling this method.
     */
    dispose () {
        this._id = RenderConstants.ID_NONE;
    }

    /**
     * @return {int} the unique ID for this Skin.
     */
    get id () {
        return this._id;
    }

    /**
     * @returns {Vec3} the origin, in object space, about which this Skin should rotate.
     */
    get rotationCenter () {
        return this._rotationCenter;
    }

    /**
     * @abstract
     * @return {[number,number]} the "native" size, in texels, of this skin.
     */
    get size () {
        return [0, 0];
    }

    setRotationCenter (x, y) {
        if (x !== this._rotationCenter[0] || y !== this._rotationCenter[1]) {
            this._rotationCenter[0] = x;
            this._rotationCenter[1] = y;
            return true;
        }
    }

    /**
     * @abstract
     * @param {[number,number]} scale - The scaling factors to be used.
     * @return {WebGLTexture} The GL texture representation of this skin when drawing at the given size.
     */
    // eslint-disable-next-line no-unused-vars
    getTexture (scale) {
        return null;
    }

    /**
     * Update and returns the uniforms for this skin.
     * @param {int} pixelsWide - The width that the skin will be rendered at, in GPU pixels.
     * @param {int} pixelsTall - The height that the skin will be rendered at, in GPU pixels.
     * @returns {object.<string, *>} the shader uniforms to be used when rendering with this Skin.
     */
    getUniforms (pixelsWide, pixelsTall) {
        this._uniforms.u_skin = this.getTexture(pixelsWide, pixelsTall);
        this._uniforms.u_skinSize = this.size;
        return this._uniforms;
    }
}

module.exports = Skin;
