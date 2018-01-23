const twgl = require('twgl.js');

const Rectangle = require('./Rectangle');
const RenderConstants = require('./RenderConstants');
const ShaderManager = require('./ShaderManager');
const Skin = require('./Skin');
const EffectTransform = require('./EffectTransform');

const __isTouchingPosition = twgl.v3.create();

const __calculateTransformVector = twgl.v3.create();

class Drawable {
    /**
     * An object which can be drawn by the renderer.
     * @todo double-buffer all rendering state (position, skin, effects, etc.)
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
             * @type {Array<number>}
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
        this._rotationMatrix = twgl.m4.identity();
        this._rotationTransformDirty = true;
        this._rotationAdjusted = twgl.v3.create();
        this._rotationCenterDirty = true;
        this._inverseMatrix = twgl.m4.identity();
        this._inverseTransformDirty = true;
        this._visible = true;
        this._effectBits = 0;

        /** @todo move convex hull functionality, maybe bounds functionality overall, to Skin classes */
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
        this._inverseTransformDirty = true;
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
     * @returns {Array<number>} the current scaling percentages applied to this Drawable. [100,100] is normal size.
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
            this._rotationTransformDirty = true;
            dirty = true;
        }
        if ('scale' in properties && (
            this._scale[0] !== properties.scale[0] ||
            this._scale[1] !== properties.scale[1])) {
            this._scale[0] = properties.scale[0];
            this._scale[1] = properties.scale[1];
            this._rotationCenterDirty = true;
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

        // twgl.m4.translation(this._position, modelMatrix);
        // dst[ 0] = 1;
        // dst[ 1] = 0;
        // dst[ 2] = 0;
        // dst[ 3] = 0;
        // dst[ 4] = 0;
        // dst[ 5] = 1;
        // dst[ 6] = 0;
        // dst[ 7] = 0;
        // dst[ 8] = 0;
        // dst[ 9] = 0;
        // dst[10] = 1;
        // dst[11] = 0;
        // dst[12] = v[0];
        // dst[13] = v[1];
        // dst[14] = v[2];
        // dst[15] = 1;

        if (this._rotationTransformDirty) {
            const rotation = (270 - this._direction) * Math.PI / 180;
            // twgl.m4.rotationZ(rotation, this._rotationMatrix);
            const c = Math.cos(rotation);
            const s = Math.sin(rotation);
            this._rotationMatrix[0] = c;
            this._rotationMatrix[1] = s;
            this._rotationMatrix[4] = -s;
            this._rotationMatrix[5] = c;
            // this._rotationMatrix[2] = 0;
            // this._rotationMatrix[3] = 0;
            // this._rotationMatrix[6] = 0;
            // this._rotationMatrix[7] = 0;
            // this._rotationMatrix[8] = 0;
            // this._rotationMatrix[9] = 0;
            // this._rotationMatrix[10] = 1;
            // this._rotationMatrix[11] = 0;
            // this._rotationMatrix[12] = 0;
            // this._rotationMatrix[13] = 0;
            // this._rotationMatrix[14] = 0;
            // this._rotationMatrix[15] = 1;

            this._rotationTransformDirty = false;
        }
        // twgl.m4.multiply(modelMatrix, this._rotationMatrix, modelMatrix);
        // const a00 = a[0];
        // const a01 = a[1];
        // const a02 = a[2];
        // const a03 = a[3];
        // const a10 = a[ 4 + 0];
        // const a11 = a[ 4 + 1];
        // const a12 = a[ 4 + 2];
        // const a13 = a[ 4 + 3];
        // const a20 = a[ 8 + 0];
        // const a21 = a[ 8 + 1];
        // const a22 = a[ 8 + 2];
        // const a23 = a[ 8 + 3];
        // const a30 = a[12 + 0];
        // const a31 = a[12 + 1];
        // const a32 = a[12 + 2];
        // const a33 = a[12 + 3];
        // const b00 = b[0];
        // const b01 = b[1];
        // const b02 = b[2];
        // const b03 = b[3];
        // const b10 = b[ 4 + 0];
        // const b11 = b[ 4 + 1];
        // const b12 = b[ 4 + 2];
        // const b13 = b[ 4 + 3];
        // const b20 = b[ 8 + 0];
        // const b21 = b[ 8 + 1];
        // const b22 = b[ 8 + 2];
        // const b23 = b[ 8 + 3];
        // const b30 = b[12 + 0];
        // const b31 = b[12 + 1];
        // const b32 = b[12 + 2];
        // const b33 = b[12 + 3];
        //
        // dst[ 0] = a00 * b00 + a10 * b01 + a20 * b02 + a30 * b03;
        // dst[ 1] = a01 * b00 + a11 * b01 + a21 * b02 + a31 * b03;
        // dst[ 2] = a02 * b00 + a12 * b01 + a22 * b02 + a32 * b03;
        // dst[ 3] = a03 * b00 + a13 * b01 + a23 * b02 + a33 * b03;
        // dst[ 4] = a00 * b10 + a10 * b11 + a20 * b12 + a30 * b13;
        // dst[ 5] = a01 * b10 + a11 * b11 + a21 * b12 + a31 * b13;
        // dst[ 6] = a02 * b10 + a12 * b11 + a22 * b12 + a32 * b13;
        // dst[ 7] = a03 * b10 + a13 * b11 + a23 * b12 + a33 * b13;
        // dst[ 8] = a00 * b20 + a10 * b21 + a20 * b22 + a30 * b23;
        // dst[ 9] = a01 * b20 + a11 * b21 + a21 * b22 + a31 * b23;
        // dst[10] = a02 * b20 + a12 * b21 + a22 * b22 + a32 * b23;
        // dst[11] = a03 * b20 + a13 * b21 + a23 * b22 + a33 * b23;
        // dst[12] = a00 * b30 + a10 * b31 + a20 * b32 + a30 * b33;
        // dst[13] = a01 * b30 + a11 * b31 + a21 * b32 + a31 * b33;
        // dst[14] = a02 * b30 + a12 * b31 + a22 * b32 + a32 * b33;
        // dst[15] = a03 * b30 + a13 * b31 + a23 * b32 + a33 * b33;

        // dst[0] = 1 * r[0] + 0 * r[1] + 0 * 0 + 0 * 0;
        // dst[1] = 0 * r[0] + 1 * r[1] + 0 * 0 + 0 * 0;
        // dst[4] = 1 * r[4] + 0 * r[5] + 0 * 0 + 0 * 0;
        // dst[5] = 0 * r[4] + 1 * r[5] + 0 * 0 + 0 * 0;
        // dst[10] = 1 * 1;
        // dst[12] = p[0] * 1;
        // dst[13] = p[1] * 1;
        // dst[14] = 0 * 1;
        // dst[15] = 1 * 1;

        // Adjust rotation center relative to the skin.
        if (this._rotationCenterDirty) {
            let rotationAdjusted = twgl.v3.subtract(this.skin.rotationCenter, twgl.v3.divScalar(this.skin.size, 2, this._rotationAdjusted), this._rotationAdjusted);
            rotationAdjusted = twgl.v3.multiply(rotationAdjusted, this.scale, rotationAdjusted);
            rotationAdjusted = twgl.v3.divScalar(rotationAdjusted, 100, rotationAdjusted);
            rotationAdjusted[1] *= -1; // Y flipped to Scratch coordinate.
            rotationAdjusted[2] = 0; // Z coordinate is 0.
            this._rotationCenterDirty = false;
        }

        // twgl.m4.translate(modelMatrix, this._rotationAdjusted, modelMatrix);
        // const v0 = v[0];
        // const v1 = v[1];
        // const v2 = v[2];
        // const m00 = m[0];
        // const m01 = m[1];
        // const m02 = m[2];
        // const m03 = m[3];
        // const m10 = m[1 * 4 + 0];
        // const m11 = m[1 * 4 + 1];
        // const m12 = m[1 * 4 + 2];
        // const m13 = m[1 * 4 + 3];
        // const m20 = m[2 * 4 + 0];
        // const m21 = m[2 * 4 + 1];
        // const m22 = m[2 * 4 + 2];
        // const m23 = m[2 * 4 + 3];
        // const m30 = m[3 * 4 + 0];
        // const m31 = m[3 * 4 + 1];
        // const m32 = m[3 * 4 + 2];
        // const m33 = m[3 * 4 + 3];
        //
        // if (m !== dst) {
        //   dst[ 0] = m00;
        //   dst[ 1] = m01;
        //   dst[ 2] = m02;
        //   dst[ 3] = m03;
        //   dst[ 4] = m10;
        //   dst[ 5] = m11;
        //   dst[ 6] = m12;
        //   dst[ 7] = m13;
        //   dst[ 8] = m20;
        //   dst[ 9] = m21;
        //   dst[10] = m22;
        //   dst[11] = m23;
        // }
        //
        // dst[12] = m00 * v0 + m10 * v1 + m20 * v2 + m30;
        // dst[13] = m01 * v0 + m11 * v1 + m21 * v2 + m31;
        // dst[14] = m02 * v0 + m12 * v1 + m22 * v2 + m32;
        // dst[15] = m03 * v0 + m13 * v1 + m23 * v2 + m33;

        // dst[0] = 1 * r[0] + 0 * r[1] + 0 * 0 + 0 * 0;
        // dst[1] = 0 * r[0] + 1 * r[1] + 0 * 0 + 0 * 0;
        // dst[4] = 1 * r[4] + 0 * r[5] + 0 * 0 + 0 * 0;
        // dst[5] = 0 * r[4] + 1 * r[5] + 0 * 0 + 0 * 0;
        // dst[10] = 1 * 1;
        // dst[12] = r[0] * a[0] + r[4] * a[1] + 0 * 0 + p[0];
        // dst[13] = r[1] * a[0] + r[5] * a[1] + 0 * 0 + p[1];
        // dst[14] = 0 * a[0] + 0 * a[1] + 0 * 0 + 0;
        // dst[15] = 0 * a[0] + 0 * a[1] + 0 * 0 + 1;

        // const scaledSize = twgl.v3.divScalar(twgl.v3.multiply(this.skin.size, this._scale, __calculateTransformVector), 100, __calculateTransformVector);
        // scaledSize[2] = 0; // was NaN because the vectors have only 2 components.

        const scaledSize = __calculateTransformVector;
        scaledSize[0] = this.skin.size[0] * this._scale[0] / 100;
        scaledSize[1] = this.skin.size[1] * this._scale[1] / 100;
        // scaledSize[2] = 0;

        // twgl.m4.scale(modelMatrix, scaledSize, modelMatrix);
        // const v0 = v[0];
        // const v1 = v[1];
        // const v2 = v[2];
        //
        // dst[ 0] = v0 * m[0 * 4 + 0];
        // dst[ 1] = v0 * m[0 * 4 + 1];
        // dst[ 2] = v0 * m[0 * 4 + 2];
        // dst[ 3] = v0 * m[0 * 4 + 3];
        // dst[ 4] = v1 * m[1 * 4 + 0];
        // dst[ 5] = v1 * m[1 * 4 + 1];
        // dst[ 6] = v1 * m[1 * 4 + 2];
        // dst[ 7] = v1 * m[1 * 4 + 3];
        // dst[ 8] = v2 * m[2 * 4 + 0];
        // dst[ 9] = v2 * m[2 * 4 + 1];
        // dst[10] = v2 * m[2 * 4 + 2];
        // dst[11] = v2 * m[2 * 4 + 3];
        //
        // if (m !== dst) {
        //   dst[12] = m[12];
        //   dst[13] = m[13];
        //   dst[14] = m[14];
        //   dst[15] = m[15];
        // }

        // dst[ 0] = s[0] * r[0];
        // dst[ 1] = s[0] * r[1];
        // dst[ 2] = s[0] * 0;
        // dst[ 3] = s[0] * (r[0] * a[0] + r[4] * a[1] + 0 * 0 + p[0]);
        // dst[ 4] = s[1] * r[4];
        // dst[ 5] = s[1] * r[5];
        // dst[ 6] = s[1] * 0;
        // dst[ 7] = s[1] * (r[1] * a[0] + r[5] * a[1] + 0 * 0 + p[1]);
        // dst[ 8] = 0 * 0;
        // dst[ 9] = 0 * 0;
        // dst[10] = 0 * 1;
        // dst[11] = 0 * 0;
        // dst[12] = r[0] * a[0] + r[4] * a[1] + 0 * 0 + p[0];
        // dst[13] = r[1] * a[0] + r[5] * a[1] + 0 * 0 + p[1];
        // dst[14] = 0 * a[0] + 0 * a[1] + 0 * 0 + 0;
        // dst[15] = 0 * a[0] + 0 * a[1] + 0 * 0 + 1;

        const scale0 = scaledSize[0];
        const scale1 = scaledSize[1];
        const rotation00 = this._rotationMatrix[0];
        const rotation01 = this._rotationMatrix[1];
        const rotation10 = this._rotationMatrix[4];
        const rotation11 = this._rotationMatrix[5];
        const adjusted0 = this._rotationAdjusted[0];
        const adjusted1 = this._rotationAdjusted[1];
        const position0 = this._position[0];
        const position1 = this._position[1];

        const dst = modelMatrix;
        dst[0] = scale0 * rotation00;
        dst[1] = scale0 * rotation01;
        // dst[2] = 0;
        // dst[3] = 0;
        dst[4] = scale1 * rotation10;
        dst[5] = scale1 * rotation11;
        // dst[6] = 0;
        // dst[7] = 0;
        // dst[8] = 0;
        // dst[9] = 0;
        // dst[10] = 1;
        // dst[11] = 0;
        dst[12] = rotation00 * adjusted0 + rotation10 * adjusted1 + position0;
        dst[13] = rotation01 * adjusted0 + rotation11 * adjusted1 + position1;
        // dst[14] = 0;
        // dst[15] = 1;

        this._transformDirty = false;
    }

    /**
     * Whether the Drawable needs convex hull points provided by the renderer.
     * @return {boolean} True when no convex hull known, or it's dirty.
     */
    needsConvexHullPoints () {
        return !this._convexHullPoints || this._convexHullDirty || this._convexHullPoints.length === 0;
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
     * @param {Array<Array<number>>} points Convex hull points, as [[x, y], ...]
     */
    setConvexHullPoints (points) {
        this._convexHullPoints = points;
        this._convexHullDirty = false;
    }

    /**
     * Check if the world position touches the skin.
     * @param {twgl.v3} vec World coordinate vector.
     * @return {boolean} True if the world position touches the skin.
     */
    isTouching (vec) {
        if (!this.skin) {
            return false;
        }

        if (this._transformDirty) {
            this._calculateTransform();
        }

        // Get the inverse of the model matrix or update it.
        const inverse = this._inverseMatrix;
        if (this._inverseTransformDirty) {
            const model = twgl.m4.copy(this._uniforms.u_modelMatrix, inverse);
            // The normal matrix uses a z scaling of 0 causing model[10] to be
            // 0. Getting a 4x4 inverse is impossible without a scaling in x, y,
            // and z.
            model[10] = 1;
            twgl.m4.inverse(model, model);
            this._inverseTransformDirty = false;
        }

        // Transfrom from world coordinates to Drawable coordinates.
        const localPosition = twgl.m4.transformPoint(inverse, vec, __isTouchingPosition);

        // Transform into texture coordinates. 0, 0 is the bottom left. 1, 1 is
        // the top right.
        localPosition[0] += 0.5;
        localPosition[1] += 0.5;
        // The RenderWebGL quad flips the texture's X axis. So rendered bottom
        // left is 1, 0 and the top right is 0, 1. Flip the X axis so
        // localPosition matches that transformation.
        localPosition[0] = 1 - localPosition[0];

        // Apply texture effect transform.
        EffectTransform.transformPoint(this, localPosition, localPosition);

        return this.skin.isTouching(localPosition);
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
        this._rotationCenterDirty = true;
        this.setConvexHullDirty();
        this.setTransformDirty();
    }

    /**
     * Calculate a color to represent the given ID number. At least one component of
     * the resulting color will be non-zero if the ID is not RenderConstants.ID_NONE.
     * @param {int} id The ID to convert.
     * @returns {Array<number>} An array of [r,g,b,a], each component in the range [0,1].
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
