const EventEmitter = require('events');

const twgl = require('twgl.js');

const RenderConstants = require('./RenderConstants');
const Silhouette = require('./Silhouette');

class Skin extends EventEmitter {
    /**
     * Create a Skin, which stores and/or generates textures for use in rendering.
     * @param {int} id - The unique ID for this Skin.
     * @constructor
     */
    constructor (id) {
        super();

        /** @type {int} */
        this._id = id;

        /** @type {Vec3} */
        this._rotationCenter = twgl.v3.create(0, 0);

        /** @type {WebGLTexture} */
        this._texture = null;

        /**
         * The uniforms to be used by the vertex and pixel shaders.
         * Some of these are used by other parts of the renderer as well.
         * @type {Object.<string,*>}
         * @private
         */
        this._uniforms = {
            /**
             * The nominal (not necessarily current) size of the current skin.
             * @type {Array<number>}
             */
            u_skinSize: [0, 0],

            /**
             * The actual WebGL texture object for the skin.
             * @type {WebGLTexture}
             */
            u_skin: null
        };

        /**
         * A silhouette to store touching data, skins are responsible for keeping it up to date.
         * @private
         */
        this._silhouette = new Silhouette();

        this.setMaxListeners(RenderConstants.SKIN_SHARE_SOFT_LIMIT);
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
     * @return {Array<number>} the "native" size, in texels, of this skin.
     */
    get size () {
        return [0, 0];
    }

    /**
     * Should this skin's texture be filtered with nearest-neighbor or linear interpolation at the given scale?
     * @param {?Array<Number>} scale The screen-space X and Y scaling factors at which this skin's texture will be
     * displayed, as percentages (100 means 1 "native size" unit is 1 screen pixel; 200 means 2 screen pixels, etc).
     * @param {Drawable} drawable The drawable that this skin's texture will be applied to.
     * @return {boolean} True if this skin's texture, as returned by {@link getTexture}, should be filtered with
     * nearest-neighbor interpolation.
     */
    // eslint-disable-next-line no-unused-vars
    useNearest (scale, drawable) {
        return true;
    }

    /**
     * Get the center of the current bounding box
     * @return {Array<number>} the center of the current bounding box
     */
    calculateRotationCenter () {
        return [this.size[0] / 2, this.size[1] / 2];
    }

    /**
     * @abstract
     * @param {Array<number>} scale - The scaling factors to be used.
     * @return {WebGLTexture} The GL texture representation of this skin when drawing at the given size.
     */
    // eslint-disable-next-line no-unused-vars
    getTexture (scale) {
        return this._emptyImageTexture;
    }

    /**
     * Get the bounds of the drawable for determining its fenced position.
     * @param {Array<number>} drawable - The Drawable instance this skin is using.
     * @param {?Rectangle} result - Optional destination for bounds calculation.
     * @return {!Rectangle} The drawable's bounds. For compatibility with Scratch 2, we always use getAABB.
     */
    getFenceBounds (drawable, result) {
        return drawable.getAABB(result);
    }

    /**
     * Update and returns the uniforms for this skin.
     * @param {Array<number>} scale - The scaling factors to be used.
     * @returns {object.<string, *>} the shader uniforms to be used when rendering with this Skin.
     */
    getUniforms (scale) {
        this._uniforms.u_skin = this.getTexture(scale);
        this._uniforms.u_skinSize = this.size;
        return this._uniforms;
    }

    /**
     * If the skin defers silhouette operations until the last possible minute,
     * this will be called before isTouching uses the silhouette.
     * @abstract
     */
    updateSilhouette () {}

    /**
     * Set this skin's texture to the given image.
     * @param {ImageData|HTMLCanvasElement} textureData - The canvas or image data to set the texture to.
     */
    _setTexture (textureData) {
        const gl = this._renderer.gl;

        gl.bindTexture(gl.TEXTURE_2D, this._texture);
        // Premultiplied alpha is necessary for proper blending.
        // See http://www.realtimerendering.com/blog/gpus-prefer-premultiplication/
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureData);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);

        this._silhouette.update(textureData);
    }

    /**
     * Set the contents of this skin to an empty skin.
     * @fires Skin.event:WasAltered
     */
    setEmptyImageData () {
        // Free up the current reference to the _texture
        this._texture = null;

        if (!this._emptyImageData) {
            // Create a transparent pixel
            this._emptyImageData = new ImageData(1, 1);

            // Create a new texture and update the silhouette
            const gl = this._renderer.gl;

            const textureOptions = {
                auto: true,
                wrap: gl.CLAMP_TO_EDGE,
                src: this._emptyImageData
            };

            // Note: we're using _emptyImageTexture here instead of _texture
            // so that we can cache this empty texture for later use as needed.
            // this._texture can get modified by other skins (e.g. BitmapSkin
            // and SVGSkin, so we can't use that same field for caching)
            this._emptyImageTexture = twgl.createTexture(gl, textureOptions);
        }

        this._rotationCenter[0] = 0;
        this._rotationCenter[1] = 0;

        this._silhouette.update(this._emptyImageData);
        this.emit(Skin.Events.WasAltered);
    }

    /**
     * Does this point touch an opaque or translucent point on this skin?
     * Nearest Neighbor version
     * The caller is responsible for ensuring this skin's silhouette is up-to-date.
     * @see updateSilhouette
     * @see Drawable.updateCPURenderAttributes
     * @param {twgl.v3} vec A texture coordinate.
     * @return {boolean} Did it touch?
     */
    isTouchingNearest (vec) {
        return this._silhouette.isTouchingNearest(vec);
    }

    /**
     * Does this point touch an opaque or translucent point on this skin?
     * Linear Interpolation version
     * The caller is responsible for ensuring this skin's silhouette is up-to-date.
     * @see updateSilhouette
     * @see Drawable.updateCPURenderAttributes
     * @param {twgl.v3} vec A texture coordinate.
     * @return {boolean} Did it touch?
     */
    isTouchingLinear (vec) {
        return this._silhouette.isTouchingLinear(vec);
    }

}

/**
 * These are the events which can be emitted by instances of this class.
 * @enum {string}
 */
Skin.Events = {
    /**
     * Emitted when anything about the Skin has been altered, such as the appearance or rotation center.
     * @event Skin.event:WasAltered
     */
    WasAltered: 'WasAltered'
};

module.exports = Skin;
