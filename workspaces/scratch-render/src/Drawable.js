const Rectangle = require('./Rectangle');

class Drawable {
    /**
     * Abstract base class for objects which can be drawn by the renderer.
     * @param {WebGLRenderingContext} gl The OpenGL context.
     * @constructor
     */
    constructor (gl) {
        this._id = Drawable._nextDrawable++;
        Drawable._allDrawables[this._id] = this;

        /** @type {WebGLRenderingContext} */
        this._gl = gl;
    }

    /**
     * Dispose of this Drawable. Do not use it after calling this method.
     */
    dispose () {
        if (this._id >= 0) {
            delete Drawable[this._id];
            this._id = Drawable.NONE;
        }
    }

    /**
     * Retrieve the ID for this Drawable.
     * @returns {number} The ID for this Drawable.
     */
    get id () {
        return this._id;
    }

    /**
     * @returns {boolean} whether this Drawable is visible.
     */
    getVisible () {
        return this._visible;
    }

    /**
     * Whether the Drawable needs convex hull points provided by the renderer.
     * @return {boolean} True when no convex hull known, or it's dirty.
     */
    needsConvexHullPoints () {
        return false;
    }

    /**
     * Get the precise bounds for a Drawable.
     * This function applies the transform matrix to the known convex hull,
     * and then finds the minimum box along the axes.
     * Before calling this, ensure the renderer has updated convex hull points.
     * @return {!Rectangle} Bounds for a tight box around the Drawable.
     */
    getBounds () {
        return new Rectangle();
    }

    /**
     * Get the rough axis-aligned bounding box for the Drawable.
     * Calculated by transforming the skin's bounds.
     * Note that this is less precise than the box returned by `getBounds`,
     * which is tightly snapped to account for a Drawable's transparent regions.
     * `getAABB` returns a much less accurate bounding box, but will be much
     * faster to calculate so may be desired for quick checks/optimizations.
     * @return {!Rectangle} Rough axis-aligned bounding box for Drawable.
     */
    getAABB () {
        return new Rectangle();
    }

    /**
     * Return the best Drawable bounds possible without performing graphics queries.
     * I.e., returns the tight bounding box when the convex hull points are already
     * known, but otherwise return the rough AABB of the Drawable.
     * @return {!Rectangle} Bounds for the Drawable.
     */
    getFastBounds () {
        return new Rectangle();
    }

    /**
     * An invalid Drawable ID which can be used to signify absence, etc.
     * @type {int}
     */
    static get NONE () {
        return -1;
    }

    /**
     * Fetch a Drawable by its ID number.
     * @param {int} drawableID The ID of the Drawable to fetch.
     * @returns {?Drawable} The specified Drawable if found, otherwise null.
     */
    static getDrawableByID (drawableID) {
        return Drawable._allDrawables[drawableID];
    }

    /**
     * Calculate a color to represent the given ID number. At least one component of
     * the resulting color will be non-zero if the ID is not Drawable.NONE.
     * @param {int} id The ID to convert.
     * @returns {number[]} An array of [r,g,b,a], each component in the range [0,1].
     */
    static color4fFromID (id) {
        id -= Drawable.NONE;
        const r = ((id >> 0) & 255) / 255.0;
        const g = ((id >> 8) & 255) / 255.0;
        const b = ((id >> 16) & 255) / 255.0;
        return [r, g, b, 1.0];
    }

    /**
     * Calculate the ID number represented by the given color. If all components of
     * the color are zero, the result will be Drawable.NONE; otherwise the result
     * will be a valid ID.
     * @param {int} r The red value of the color, in the range [0,255].
     * @param {int} g The green value of the color, in the range [0,255].
     * @param {int} b The blue value of the color, in the range [0,255].
     * @returns {int} The ID represented by that color.
     */
    static color4bToID (r, g, b) {
        let id;
        id = (r & 255) << 0;
        id |= (g & 255) << 8;
        id |= (b & 255) << 16;
        return id + Drawable.NONE;
    }
}

/**
 * The ID to be assigned next time the Drawable constructor is called.
 * @type {number}
 * @private
 */
Drawable._nextDrawable = 0;

/**
 * All current Drawables, by ID.
 * @type {Object.<int, Drawable>}
 * @private
 */
Drawable._allDrawables = {};

module.exports = Drawable;
