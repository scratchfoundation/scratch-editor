const twgl = require('twgl.js');
const xhr = require('xhr');

const Drawable = require('./Drawable');
const Rectangle = require('./Rectangle');
const SvgRenderer = require('./svg-quirks-mode/svg-renderer');
const ShaderManager = require('./ShaderManager');


class SkinnedDrawable extends Drawable {
    /**
     * An object which can be drawn by the renderer with textures generated from skins.
     * TODO: double-buffer all rendering state (position, skin, effects, etc.)
     * @param {WebGLRenderingContext} gl The OpenGL context.
     * @constructor
     */
    constructor (gl) {
        super(gl);

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
             * The nominal (not necessarily current) size of the current skin.
             * This is scaled by _costumeResolution.
             * @type {number[]}
             */
            u_skinSize: [0, 0],

            /**
             * The actual WebGL texture object for the skin.
             * @type {WebGLTexture}
             */
            u_skin: null,

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
        this._rotationCenter = twgl.v3.create(0, 0);
        this._direction = 90;
        this._transformDirty = true;
        this._visible = true;
        this._effectBits = 0;

        this._convexHullPoints = null;
        this._convexHullDirty = true;

        // Create a transparent 1x1 texture for temporary use
        const tempTexture = twgl.createTexture(gl, {src: [0, 0, 0, 0]});
        this._useSkin(tempTexture, 0, 0, 1, true);

        // Load a real skin
        this.setSkin(SkinnedDrawable._DEFAULT_SKIN);
    }

    /**
     * Dispose of this SkinnedDrawable. Do not use it after calling this method.
     */
    dispose () {
        this.setSkin(null);
        super.dispose();
    }

    /**
     * Mark this Drawable's transform as dirty.
     * It will be recalculated next time it's needed.
     */
    setTransformDirty () {
        this._transformDirty = true;
    }

    /**
     * Set this Drawable's skin.
     * The Drawable will continue using the existing skin until the new one loads.
     * If there is no existing skin, the Drawable will use a 1x1 transparent image.
     * @param {string} skinUrl The URL of the skin.
     * @param {number=} optCostumeResolution Optionally, a resolution for the skin.
     */
    setSkin (skinUrl, optCostumeResolution) {
        // TODO: cache Skins instead of loading each time. Ref count them?
        // TODO: share Skins across Drawables - see also destroy()
        if (skinUrl) {
            const ext = skinUrl.substring(skinUrl.lastIndexOf('.') + 1);
            switch (ext) {
            case 'svg':
            case 'svg/get/':
            case 'svgz':
            case 'svgz/get/':
                this._setSkinSVG(skinUrl);
                break;
            default:
                this._setSkinBitmap(skinUrl, optCostumeResolution);
                break;
            }
        } else {
            this._useSkin(null, 0, 0, 1, true);
        }
    }

    /**
     * Use a skin if it is the currently-pending skin, or if skipPendingCheck==true.
     * If the passed skin is used (for either reason) _pendingSkin will be cleared.
     * @param {WebGLTexture} skin The skin to use.
     * @param {int} width The width of the skin.
     * @param {int} height The height of the skin.
     * @param {int} costumeResolution The resolution to use for this skin.
     * @param {boolean} [skipPendingCheck] If true, don't compare to _pendingSkin.
     * @private
     */
    _useSkin (skin, width, height, costumeResolution, skipPendingCheck) {
        if (skipPendingCheck || (skin === this._pendingSkin)) {
            this._pendingSkin = null;
            if (this._uniforms.u_skin && (this._uniforms.u_skin !== skin)) {
                this._gl.deleteTexture(this._uniforms.u_skin);
            }
            this._setSkinSize(width, height, costumeResolution);
            this._uniforms.u_skin = skin;
        }
    }

    /**
     * @returns {int} A bitmask identifying which effects are currently in use.
     */
    getEnabledEffects () {
        return this._effectBits;
    }

    /**
     * Load a bitmap skin. Supports the same formats as the Image element.
     * @param {string} skinMd5ext The MD5 and file extension of the bitmap skin.
     * @param {number=} optCostumeResolution Optionally, a resolution for the skin.
     * @private
     */
    _setSkinBitmap (skinMd5ext, optCostumeResolution) {
        const url = skinMd5ext;
        this._setSkinCore(url, optCostumeResolution);
    }

    /**
     * Load an SVG-based skin. This still needs quite a bit of work to match the
     * level of quality found in Scratch 2.0:
     * - We should detect when a skin is being scaled up and render the SVG at a
     *   higher resolution in those cases.
     * - Colors seem a little off. This may be browser-specific.
     * - This method works in Chrome, Firefox, Safari, and Edge but causes a
     *   security error in IE.
     * @param {string} skinMd5ext The MD5 and file extension of the SVG skin.
     * @private
     */
    _setSkinSVG (skinMd5ext) {
        const url = skinMd5ext;

        const svgCanvas = document.createElement('canvas');
        const svgRenderer = new SvgRenderer(svgCanvas);

        const gotSVG = (err, response, body) => {
            if (!err) {
                svgRenderer.fromString(body, () => {
                    this._setSkinCore(svgCanvas, svgRenderer.getDrawRatio());
                });
            }
        };
        xhr.get({
            useXDR: true,
            url: url
        }, gotSVG);
        // TODO: if there's no current u_skin, install *something* before returning
    }

    /**
     * Common code for setting all skin types.
     * @param {string|Image} source The source of image data for the skin.
     * @param {int} costumeResolution The resolution to use for this skin.
     * @private
     */
    _setSkinCore (source, costumeResolution) {
        const callback = (err, texture, sourceInCallback) => {
            if (!err && (this._pendingSkin === texture)) {
                this._useSkin(texture, sourceInCallback.width, sourceInCallback.height, costumeResolution);
            }
        };

        const gl = this._gl;
        const options = {
            auto: true,
            mag: gl.NEAREST,
            min: gl.NEAREST, // TODO: mipmaps, linear (except pixelate)
            wrap: gl.CLAMP_TO_EDGE,
            src: source
        };
        const willCallCallback = typeof source === 'string';
        this._pendingSkin = twgl.createTexture(gl, options, willCallCallback ? callback : null);

        // If we won't get a callback, start using the skin immediately.
        // This will happen if the data is already local.
        if (!willCallCallback) {
            callback(null, this._pendingSkin, source);
        }
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
        if ('skin' in properties) {
            this.setSkin(properties.skin, properties.costumeResolution);
            this.setConvexHullDirty();
        }
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
        if ('rotationCenter' in properties && (
            this._rotationCenter[0] !== properties.rotationCenter[0] ||
            this._rotationCenter[1] !== properties.rotationCenter[1])) {
            this._rotationCenter[0] = properties.rotationCenter[0];
            this._rotationCenter[1] = properties.rotationCenter[1];
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
     * Set the dimensions of this Drawable's skin.
     * @param {int} width The width of the new skin.
     * @param {int} height The height of the new skin.
     * @param {int} [costumeResolution] The resolution to use for this skin.
     * @private
     */
    _setSkinSize (width, height, costumeResolution) {
        costumeResolution = costumeResolution || 1;
        width /= costumeResolution;
        height /= costumeResolution;
        if (this._uniforms.u_skinSize[0] !== width || this._uniforms.u_skinSize[1] !== height) {
            this._uniforms.u_skinSize[0] = width;
            this._uniforms.u_skinSize[1] = height;
            this.setTransformDirty();
        }
        this.setConvexHullDirty();
    }

    /**
     * Get the size of the Drawable's current skin.
     * @return {Array.<number>} Skin size, width and height.
     */
    getSkinSize () {
        return this._uniforms.u_skinSize.slice();
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
        const rotationAdjusted = twgl.v3.subtract(
            this._rotationCenter,
            twgl.v3.divScalar(this._uniforms.u_skinSize, 2)
        );
        rotationAdjusted[1] *= -1; // Y flipped to Scratch coordinate.
        rotationAdjusted[2] = 0; // Z coordinate is 0.

        twgl.m4.translate(modelMatrix, rotationAdjusted, modelMatrix);

        const scaledSize = twgl.v3.divScalar(twgl.v3.multiply(this._uniforms.u_skinSize, this._scale), 100);
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
        const skinSize = this._uniforms.u_skinSize;
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
}

// TODO: fall back on a built-in skin to protect against network problems
SkinnedDrawable._DEFAULT_SKIN = {
    squirrel: 'https://cdn.assets.scratch.mit.edu/internalapi/asset/7e24c99c1b853e52f8e7f9004416fa34.png/get/',
    bus: 'https://cdn.assets.scratch.mit.edu/internalapi/asset/66895930177178ea01d9e610917f8acf.png/get/',
    scratch_cat: 'https://cdn.assets.scratch.mit.edu/internalapi/asset/09dc888b0b7df19f70d81588ae73420e.svg/get/',
    gradient: 'https://cdn.assets.scratch.mit.edu/internalapi/asset/a49ff276b9b8f997a1ae163992c2c145.png/get/'
}.squirrel;

module.exports = SkinnedDrawable;
