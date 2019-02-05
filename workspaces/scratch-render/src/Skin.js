const EventEmitter = require('events');

const twgl = require('twgl.js');

const RenderConstants = require('./RenderConstants');
const Silhouette = require('./Silhouette');

/**
 * Truncate a number into what could be stored in a 32 bit floating point value.
 * @param {number} num Number to truncate.
 * @return {number} Truncated value.
 */
const toFloat32 = (function () {
    const memory = new Float32Array(1);
    return function (num) {
        memory[0] = num;
        return memory[0];
    };
}());

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
     * @returns {boolean} true for a raster-style skin (like a BitmapSkin), false for vector-style (like SVGSkin).
     */
    get isRaster () {
        return false;
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
     * Set the origin, in object space, about which this Skin should rotate.
     * @param {number} x - The x coordinate of the new rotation center.
     * @param {number} y - The y coordinate of the new rotation center.
     * @fires Skin.event:WasAltered
     */
    setRotationCenter (x, y) {
        const emptySkin = this.size[0] === 0 && this.size[1] === 0;
        // Compare a 32 bit x and y value against the stored 32 bit center
        // values.
        const changed = (
            toFloat32(x) !== this._rotationCenter[0] ||
            toFloat32(y) !== this._rotationCenter[1]);
        if (!emptySkin && changed) {
            this._rotationCenter[0] = x;
            this._rotationCenter[1] = y;
            this.emit(Skin.Events.WasAltered);
        }
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
        return null;
    }

    /**
     * Get the bounds of the drawable for determining its fenced position.
     * @param {Array<number>} drawable - The Drawable instance this skin is using.
     * @return {!Rectangle} The drawable's bounds.
     */
    getFenceBounds (drawable) {
        return drawable.getFastBounds();
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
     * Does this point touch an opaque or translucent point on this skin?
     * Nearest Neighbor version
     * @param {twgl.v3} vec A texture coordinate.
     * @return {boolean} Did it touch?
     */
    isTouchingNearest (vec) {
        return this._silhouette.isTouchingNearest(vec);
    }

    /**
     * Does this point touch an opaque or translucent point on this skin?
     * Linear Interpolation version
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
