const twgl = require('twgl.js');

const Rectangle = require('./Rectangle');
const RenderConstants = require('./RenderConstants');
const ShaderManager = require('./ShaderManager');
const Skin = require('./Skin');


class Drawable {
    /**
     * An object which can be drawn by the renderer.
     * TODO: double-buffer all rendering state (position, skin, effects, etc.)
     * @param {!int} id - This Drawable's unique ID.
     * @constructor
     */
    constructor (id) {
        /** @type {!int} */
        this._id = id;

        /**
         * The uniforms to be used by the vertex and pixel shaders.
         * Some of these are used by other parts of the renderer as well.
         * @type {Object.<string,*>}
         * @private
         */
        this._uniforms = {
            /**
             * The model matrix, to concat with projection at draw time.
             * @type {module:twgl/m4.Mat4}
             */
            u_modelMatrix: twgl.m4.identity(),

            /**
             * The color to use in the silhouette draw mode.
             * @type {number[]}
             */
            u_silhouetteColor: Drawable.color4fFromID(this._id)
        };

        // Effect values are uniforms too
        const numEffects = ShaderManager.EFFECTS.length;
        for (let index = 0; index < numEffects; ++index) {
            const effectName = ShaderManager.EFFECTS[index];
            const converter = ShaderManager.EFFECT_INFO[effectName].converter;
            this._uniforms[`u_${effectName}`] = converter(0);
        }

        this._position = twgl.v3.create(0, 0);
        this._scale = twgl.v3.create(100, 100);
        this._direction = 90;
        this._transformDirty = true;
        this._visible = true;
        this._effectBits = 0;

        // TODO: move convex hull functionality, maybe bounds functionality overall, to Skin classes
        this._convexHullPoints = null;
        this._convexHullDirty = true;

        this._skinWasAltered = this._skinWasAltered.bind(this);
    }

    /**
     * Dispose of this Drawable. Do not use it after calling this method.
     */
    dispose () {
        // Use the setter: disconnect events
        this.skin = null;
    }

    /**
     * Mark this Drawable's transform as dirty.
     * It will be recalculated next time it's needed.
     */
    setTransformDirty () {
        this._transformDirty = true;
    }

    /**
     * @returns {number} The ID for this Drawable.
     */
    get id () {
        return this._id;
    }

    /**
     * @returns {Skin} the current skin for this Drawable.
     */
    get skin () {
        return this._skin;
    }

    /**
     * @param {Skin} newSkin - A new Skin for this Drawable.
     */
    set skin (newSkin) {
        if (this._skin !== newSkin) {
            if (this._skin) {
                this._skin.removeListener(Skin.Events.WasAltered, this._skinWasAltered);
            }
            this._skin = newSkin;
            if (this._skin) {
                this._skin.addListener(Skin.Events.WasAltered, this._skinWasAltered);
            }
            this._skinWasAltered();
        }
    }

    /**
     * @returns {[number,number]} the current scaling percentages applied to this Drawable. [100,100] is normal size.
     */
    get scale () {
        return [this._scale[0], this._scale[1]];
    }

    /**
     * @returns {int} A bitmask identifying which effects are currently in use.
     */
    getEnabledEffects () {
        return this._effectBits;
    }

    /**
     * @returns {object.<string, *>} the shader uniforms to be used when rendering this Drawable.
     */
    getUniforms () {
        if (this._transformDirty) {
            this._calculateTransform();
        }
        return this._uniforms;
    }

    /**
     * @returns {boolean} whether this Drawable is visible.
     */
    getVisible () {
        return this._visible;
    }

    /**
     * Update the position, direction, scale, or effect properties of this Drawable.
     * @param {object.<string,*>} properties The new property values to set.
     */
    updateProperties (properties) {
        let dirty = false;
        if ('position' in properties && (
            this._position[0] !== properties.position[0] ||
            this._position[1] !== properties.position[1])) {
            this._position[0] = properties.position[0];
            this._position[1] = properties.position[1];
            dirty = true;
        }
        if ('direction' in properties && this._direction !== properties.direction) {
            this._direction = properties.direction;
            dirty = true;
        }
        if ('scale' in properties && (
            this._scale[0] !== properties.scale[0] ||
            this._scale[1] !== properties.scale[1])) {
            this._scale[0] = properties.scale[0];
            this._scale[1] = properties.scale[1];
            dirty = true;
        }
        if ('visible' in properties) {
            this._visible = properties.visible;
            this.setConvexHullDirty();
        }
        if (dirty) {
            this.setTransformDirty();
        }
        const numEffects = ShaderManager.EFFECTS.length;
        for (let index = 0; index < numEffects; ++index) {
            const effectName = ShaderManager.EFFECTS[index];
            if (effectName in properties) {
                const rawValue = properties[effectName];
                const effectInfo = ShaderManager.EFFECT_INFO[effectName];
                if (rawValue) {
                    this._effectBits |= effectInfo.mask;
                } else {
                    this._effectBits &= ~effectInfo.mask;
                }
                const converter = effectInfo.converter;
                this._uniforms[`u_${effectName}`] = converter(rawValue);
                if (effectInfo.shapeChanges) {
                    this.setConvexHullDirty();
                }
            }
        }
    }

    /**
     * Calculate the transform to use when rendering this Drawable.
     * @private
     */
    _calculateTransform () {
        const modelMatrix = this._uniforms.u_modelMatrix;

        twgl.m4.identity(modelMatrix);
        twgl.m4.translate(modelMatrix, this._position, modelMatrix);

        const rotation = (270 - this._direction) * Math.PI / 180;
        twgl.m4.rotateZ(modelMatrix, rotation, modelMatrix);

        // Adjust rotation center relative to the skin.
        const rotationAdjusted = twgl.v3.subtract(this.skin.rotationCenter, twgl.v3.divScalar(this.skin.size, 2));
        rotationAdjusted[1] *= -1; // Y flipped to Scratch coordinate.
        rotationAdjusted[2] = 0; // Z coordinate is 0.

        twgl.m4.translate(modelMatrix, rotationAdjusted, modelMatrix);

        const scaledSize = twgl.v3.divScalar(twgl.v3.multiply(this.skin.size, this._scale), 100);
        scaledSize[2] = 0; // was NaN because the vectors have only 2 components.
        twgl.m4.scale(modelMatrix, scaledSize, modelMatrix);

        this._transformDirty = false;
    }

    /**
     * Whether the Drawable needs convex hull points provided by the renderer.
     * @return {boolean} True when no convex hull known, or it's dirty.
     */
    needsConvexHullPoints () {
        return !this._convexHullPoints || this._convexHullDirty;
    }

    /**
     * Set the convex hull to be dirty.
     * Do this whenever the Drawable's shape has possibly changed.
     */
    setConvexHullDirty () {
        this._convexHullDirty = true;
    }

    /**
     * Set the convex hull points for the Drawable.
     * @param {Array.<Array.<number>>} points Convex hull points, as [[x, y], ...]
     */
    setConvexHullPoints (points) {
        this._convexHullPoints = points;
        this._convexHullDirty = false;
    }

    /**
     * Get the precise bounds for a Drawable.
     * This function applies the transform matrix to the known convex hull,
     * and then finds the minimum box along the axes.
     * Before calling this, ensure the renderer has updated convex hull points.
     * @return {!Rectangle} Bounds for a tight box around the Drawable.
     */
    getBounds () {
        if (this.needsConvexHullPoints()) {
            throw new Error('Needs updated convex hull points before bounds calculation.');
        }
        if (this._transformDirty) {
            this._calculateTransform();
        }
        // First, transform all the convex hull points by the current Drawable's
        // transform. This allows us to skip recalculating the convex hull
        // for many Drawable updates, including translation, rotation, scaling.
        const projection = twgl.m4.ortho(-1, 1, -1, 1, -1, 1);
        const skinSize = this.skin.size;
        const tm = twgl.m4.multiply(this._uniforms.u_modelMatrix, projection);
        const transformedHullPoints = [];
        for (let i = 0; i < this._convexHullPoints.length; i++) {
            const point = this._convexHullPoints[i];
            const glPoint = twgl.v3.create(
                0.5 + (-point[0] / skinSize[0]),
                0.5 + (-point[1] / skinSize[1]),
                0
            );
            twgl.m4.transformPoint(tm, glPoint, glPoint);
            transformedHullPoints.push(glPoint);
        }
        // Search through transformed points to generate box on axes.
        const bounds = new Rectangle();
        bounds.initFromPointsAABB(transformedHullPoints);
        return bounds;
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
        if (this._transformDirty) {
            this._calculateTransform();
        }
        const tm = this._uniforms.u_modelMatrix;
        const bounds = new Rectangle();
        bounds.initFromPointsAABB([
            twgl.m4.transformPoint(tm, [-0.5, -0.5, 0]),
            twgl.m4.transformPoint(tm, [0.5, -0.5, 0]),
            twgl.m4.transformPoint(tm, [-0.5, 0.5, 0]),
            twgl.m4.transformPoint(tm, [0.5, 0.5, 0])
        ]);
        return bounds;
    }

    /**
     * Return the best Drawable bounds possible without performing graphics queries.
     * I.e., returns the tight bounding box when the convex hull points are already
     * known, but otherwise return the rough AABB of the Drawable.
     * @return {!Rectangle} Bounds for the Drawable.
     */
    getFastBounds () {
        if (!this.needsConvexHullPoints()) {
            return this.getBounds();
        }
        return this.getAABB();
    }

    /**
     * Respond to an internal change in the current Skin.
     * @private
     */
    _skinWasAltered () {
        this.setConvexHullDirty();
        this.setTransformDirty();
    }

    /**
     * Calculate a color to represent the given ID number. At least one component of
     * the resulting color will be non-zero if the ID is not RenderConstants.ID_NONE.
     * @param {int} id The ID to convert.
     * @returns {number[]} An array of [r,g,b,a], each component in the range [0,1].
     */
    static color4fFromID (id) {
        id -= RenderConstants.ID_NONE;
        const r = ((id >> 0) & 255) / 255.0;
        const g = ((id >> 8) & 255) / 255.0;
        const b = ((id >> 16) & 255) / 255.0;
        return [r, g, b, 1.0];
    }

    /**
     * Calculate the ID number represented by the given color. If all components of
     * the color are zero, the result will be RenderConstants.ID_NONE; otherwise the result
     * will be a valid ID.
     * @param {int} r The red value of the color, in the range [0,255].
     * @param {int} g The green value of the color, in the range [0,255].
     * @param {int} b The blue value of the color, in the range [0,255].
     * @returns {int} The ID represented by that color.
     */
    static color3bToID (r, g, b) {
        let id;
        id = (r & 255) << 0;
        id |= (g & 255) << 8;
        id |= (b & 255) << 16;
        return id + RenderConstants.ID_NONE;
    }
}

module.exports = Drawable;
