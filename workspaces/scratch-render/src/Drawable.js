var twgl = require('twgl.js');
var xhr = require('xhr');

var Rectangle = require('./Rectangle');
var SvgRenderer = require('./svg-quirks-mode/svg-renderer');
var ShaderManager = require('./ShaderManager');

class Drawable {
    /**
     * An object which can be drawn by the renderer.
     * TODO: double-buffer all rendering state (position, skin, effects, etc.)
     * @param gl The OpenGL context.
     * @constructor
     */
    constructor(gl) {
        this._id = Drawable._nextDrawable++;
        Drawable._allDrawables[this._id] = this;

        this._gl = gl;

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
        var numEffects = ShaderManager.EFFECTS.length;
        for (var index = 0; index < numEffects; ++index) {
            var effectName = ShaderManager.EFFECTS[index];
            var converter = ShaderManager.EFFECT_INFO[effectName].converter;
            this._uniforms['u_' + effectName] = converter(0);
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
        var tempTexture = twgl.createTexture(gl, {src: [0, 0, 0, 0]});
        this._useSkin(tempTexture, 0, 0, 1, true);

        // Load a real skin
        this.setSkin(Drawable._DEFAULT_SKIN);
    }
}

module.exports = Drawable;

/**
 * @callback Drawable~idFilterFunc
 * @param {int} drawableID The ID to filter.
 * @return {bool} True if the ID passes the filter, otherwise false.
 */

/**
 * An invalid Drawable ID which can be used to signify absence, etc.
 * @type {int}
 */
Drawable.NONE = -1;

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

/**
 * Fetch a Drawable by its ID number.
 * @param drawableID {int} The ID of the Drawable to fetch.
 * @returns {?Drawable} The specified Drawable if found, otherwise null.
 */
Drawable.getDrawableByID = function (drawableID) {
    return Drawable._allDrawables[drawableID];
};

// TODO: fall back on a built-in skin to protect against network problems
Drawable._DEFAULT_SKIN = {
    squirrel: 'https://cdn.assets.scratch.mit.edu/internalapi/asset/' +
        '7e24c99c1b853e52f8e7f9004416fa34.png/get/',
    bus: 'https://cdn.assets.scratch.mit.edu/internalapi/asset/' +
        '66895930177178ea01d9e610917f8acf.png/get/',
    scratch_cat: 'https://cdn.assets.scratch.mit.edu/internalapi/asset/' +
        '09dc888b0b7df19f70d81588ae73420e.svg/get/',
    gradient: 'https://cdn.assets.scratch.mit.edu/internalapi/asset/' +
        'a49ff276b9b8f997a1ae163992c2c145.png/get/'
}.squirrel;

/**
 * Dispose of this Drawable. Do not use it after calling this method.
 */
Drawable.prototype.dispose = function () {
    this.setSkin(null);
    if (this._id >= 0) {
        delete Drawable[this._id];
    }
};

/**
 * Mark this Drawable's transform as dirty.
 * It will be recalculated next time it's needed.
 */
Drawable.prototype.setTransformDirty = function () {
    this._transformDirty = true;
};

/**
 * Retrieve the ID for this Drawable.
 * @returns {number} The ID for this Drawable.
 */
Drawable.prototype.getID = function () {
    return this._id;
};

/**
 * Set this Drawable's skin.
 * The Drawable will continue using the existing skin until the new one loads.
 * If there is no existing skin, the Drawable will use a 1x1 transparent image.
 * @param {string} skin_url The URL of the skin.
 * @param {number=} opt_costumeResolution Optionally, a resolution for the skin.
 */
Drawable.prototype.setSkin = function (skin_url, opt_costumeResolution) {
    // TODO: cache Skins instead of loading each time. Ref count them?
    // TODO: share Skins across Drawables - see also destroy()
    if (skin_url) {
        var ext = skin_url.substring(skin_url.lastIndexOf('.')+1);
        switch (ext) {
        case 'svg':
        case 'svg/get/':
        case 'svgz':
        case 'svgz/get/':
            this._setSkinSVG(skin_url);
            break;
        default:
            this._setSkinBitmap(skin_url, opt_costumeResolution);
            break;
        }
    }
    else {
        this._useSkin(null, 0, 0, 1, true);
    }
};

/**
 * Use a skin if it is the currently-pending skin, or if skipPendingCheck==true.
 * If the passed skin is used (for either reason) _pendingSkin will be cleared.
 * @param {WebGLTexture} skin The skin to use.
 * @param {int} width The width of the skin.
 * @param {int} height The height of the skin.
 * @param {int} costumeResolution The resolution to use for this skin.
 * @param {Boolean} [skipPendingCheck] If true, don't compare to _pendingSkin.
 * @private
 */
Drawable.prototype._useSkin = function(
    skin, width, height, costumeResolution, skipPendingCheck) {

    if (skipPendingCheck || (skin == this._pendingSkin)) {
        this._pendingSkin = null;
        if (this._uniforms.u_skin && (this._uniforms.u_skin != skin)) {
            this._gl.deleteTexture(this._uniforms.u_skin);
        }
        this._setSkinSize(width, height, costumeResolution);
        this._uniforms.u_skin = skin;
    }
};

/**
 * @returns {int} A bitmask identifying which effects are currently in use.
 */
Drawable.prototype.getEnabledEffects = function () {
    return this._effectBits;
};

/**
 * Load a bitmap skin. Supports the same formats as the Image element.
 * @param {string} skin_md5ext The MD5 and file extension of the bitmap skin.
 * @param {number=} opt_costumeResolution Optionally, a resolution for the skin.
 * @private
 */
Drawable.prototype._setSkinBitmap = function (skin_md5ext,
        opt_costumeResolution) {
    var url = skin_md5ext;
    this._setSkinCore(url, opt_costumeResolution);
};

/**
 * Load an SVG-based skin. This still needs quite a bit of work to match the
 * level of quality found in Scratch 2.0:
 * - We should detect when a skin is being scaled up and render the SVG at a
 *   higher resolution in those cases.
 * - Colors seem a little off. This may be browser-specific.
 * - This method works in Chrome, Firefox, Safari, and Edge but causes a
 *   security error in IE.
 * @param {string} skin_md5ext The MD5 and file extension of the SVG skin.
 * @private
 */
Drawable.prototype._setSkinSVG = function (skin_md5ext) {
    var url = skin_md5ext;
    var instance = this;

    let svgCanvas = document.createElement('canvas');
    let svgRenderer = new SvgRenderer(svgCanvas);

    function gotSVG(err, response, body) {
        if (!err) {
            svgRenderer.fromString(body, function () {
                instance._setSkinCore(svgCanvas, svgRenderer.getDrawRatio());
            });
        }
    }
    xhr.get({
        useXDR: true,
        url: url
    }, gotSVG);
    // TODO: if there's no current u_skin, install *something* before returning
};

/**
 * Common code for setting all skin types.
 * @param {string|Image} source The source of image data for the skin.
 * @param {int} costumeResolution The resolution to use for this skin.
 * @private
 */
Drawable.prototype._setSkinCore = function (source, costumeResolution) {
    var instance = this;
    var callback = function (err, texture, source) {
        if (!err && (instance._pendingSkin == texture)) {
            instance._useSkin(
                texture, source.width, source.height, costumeResolution);
        }
    };

    var gl = this._gl;
    var options = {
        auto: true,
        mag: gl.NEAREST,
        min: gl.NEAREST, // TODO: mipmaps, linear (except pixelate)
        wrap: gl.CLAMP_TO_EDGE,
        src: source
    };
    var willCallCallback = typeof source == 'string';
    instance._pendingSkin = twgl.createTexture(
        gl, options, willCallCallback ? callback : null);

    // If we won't get a callback, start using the skin immediately.
    // This will happen if the data is already local.
    if (!willCallCallback) {
        callback(null, instance._pendingSkin, source);
    }
};

/**
 * Retrieve the shader uniforms to be used when rendering this Drawable.
 * @returns {Object.<string, *>}
 */
Drawable.prototype.getUniforms = function () {
    if (this._transformDirty) {
        this._calculateTransform();
    }
    return this._uniforms;
};

/**
 * Retrieve whether this Drawable is visible.
 * @returns {boolean}
 */
Drawable.prototype.getVisible = function () {
    return this._visible;
};

/**
 * Update the position, direction, scale, or effect properties of this Drawable.
 * @param {Object.<string,*>} properties The new property values to set.
 */
Drawable.prototype.updateProperties = function (properties) {
    var dirty = false;
    if ('skin' in properties) {
        this.setSkin(properties.skin, properties.costumeResolution);
        this.setConvexHullDirty();
    }
    if ('position' in properties && (
        this._position[0] != properties.position[0] ||
        this._position[1] != properties.position[1])) {
        this._position[0] = properties.position[0];
        this._position[1] = properties.position[1];
        dirty = true;
    }
    if ('direction' in properties && this._direction != properties.direction) {
        this._direction = properties.direction;
        dirty = true;
    }
    if ('scale' in properties && (
        this._scale[0] != properties.scale[0] ||
        this._scale[1] != properties.scale[1])) {
        this._scale[0] = properties.scale[0];
        this._scale[1] = properties.scale[1];
        dirty = true;
    }
    if ('rotationCenter' in properties && (
        this._rotationCenter[0] != properties.rotationCenter[0] ||
        this._rotationCenter[1] != properties.rotationCenter[1])) {
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
    var numEffects = ShaderManager.EFFECTS.length;
    for (var index = 0; index < numEffects; ++index) {
        var effectName = ShaderManager.EFFECTS[index];
        if (effectName in properties) {
            var rawValue = properties[effectName];
            var effectInfo = ShaderManager.EFFECT_INFO[effectName];
            if (rawValue != 0) {
                this._effectBits |= effectInfo.mask;
            }
            else {
                this._effectBits &= ~effectInfo.mask;
            }
            var converter = effectInfo.converter;
            this._uniforms['u_' + effectName] = converter(rawValue);
            if (effectInfo.shapeChanges) {
                this.setConvexHullDirty();
            }
        }
    }
};

/**
 * Set the dimensions of this Drawable's skin.
 * @param {int} width The width of the new skin.
 * @param {int} height The height of the new skin.
 * @param {int} [costumeResolution] The resolution to use for this skin.
 * @private
 */
Drawable.prototype._setSkinSize = function (width, height, costumeResolution) {
    costumeResolution = costumeResolution || 1;
    width /= costumeResolution;
    height /= costumeResolution;
    if (this._uniforms.u_skinSize[0] != width
        || this._uniforms.u_skinSize[1] != height) {
        this._uniforms.u_skinSize[0] = width;
        this._uniforms.u_skinSize[1] = height;
        this.setTransformDirty();
    }
    this.setConvexHullDirty();
};

/**
 * Get the size of the Drawable's current skin.
 * @return {Array.<number>} Skin size, width and height.
 */
Drawable.prototype.getSkinSize = function () {
    return this._uniforms.u_skinSize.slice();
};

/**
 * Calculate the transform to use when rendering this Drawable.
 * @private
 */
Drawable.prototype._calculateTransform = function () {
    var modelMatrix = this._uniforms.u_modelMatrix;

    twgl.m4.identity(modelMatrix);
    twgl.m4.translate(modelMatrix, this._position, modelMatrix);

    var rotation = (270 - this._direction) * Math.PI / 180;
    twgl.m4.rotateZ(modelMatrix, rotation, modelMatrix);


    // Adjust rotation center relative to the skin.
    var rotationAdjusted = twgl.v3.subtract(
        this._rotationCenter,
        twgl.v3.divScalar(this._uniforms.u_skinSize, 2)
    );
    rotationAdjusted[1] *= -1; // Y flipped to Scratch coordinate.
    rotationAdjusted[2] = 0; // Z coordinate is 0.

    twgl.m4.translate(modelMatrix, rotationAdjusted, modelMatrix);

    var scaledSize = twgl.v3.divScalar(twgl.v3.multiply(
        this._uniforms.u_skinSize, this._scale), 100);
    scaledSize[2] = 0; // was NaN because the vectors have only 2 components.
    twgl.m4.scale(modelMatrix, scaledSize, modelMatrix);

    this._transformDirty = false;
};

/**
 * Whether the Drawable needs convex hull points provided by the renderer.
 * @return {boolean} True when no convex hull known, or it's dirty.
 */
Drawable.prototype.needsConvexHullPoints = function () {
    return !this._convexHullPoints || this._convexHullDirty;
};

/**
 * Set the convex hull to be dirty.
 * Do this whenever the Drawable's shape has possibly changed.
 */
Drawable.prototype.setConvexHullDirty = function () {
    this._convexHullDirty = true;
};

/**
 * Set the convex hull points for the Drawable.
 * @param {Array.<Array.<number>>} points Convex hull points, as [[x, y], ...]
 */
Drawable.prototype.setConvexHullPoints = function (points) {
    this._convexHullPoints = points;
    this._convexHullDirty = false;
};

/**
 * Get the precise bounds for a Drawable.
 * This function applies the transform matrix to the known convex hull,
 * and then finds the minimum box along the axes.
 * Before calling this, ensure the renderer has updated convex hull points.
 * @return {!Rectangle} Bounds for a tight box around the Drawable.
 */
Drawable.prototype.getBounds = function () {
    if (this.needsConvexHullPoints()) {
        throw 'Needs updated convex hull points before bounds calculation.';
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
    let transformedHullPoints = [];
    for (let i = 0; i < this._convexHullPoints.length; i++) {
        let point = this._convexHullPoints[i];
        let glPoint = twgl.v3.create(
            0.5 + (-point[0] / skinSize[0]),
            0.5 + (-point[1] / skinSize[1]),
            0
        );
        twgl.m4.transformPoint(tm, glPoint, glPoint);
        transformedHullPoints.push(glPoint);
    }
    // Search through transformed points to generate box on axes.
    let bounds = new Rectangle();
    bounds.initFromPointsAABB(transformedHullPoints);
    return bounds;
};

/**
 * Get the rough axis-aligned bounding box for the Drawable.
 * Calculated by transforming the skin's bounds.
 * Note that this is less precise than the box returned by `getBounds`,
 * which is tightly snapped to account for a Drawable's transparent regions.
 * `getAABB` returns a much less accurate bounding box, but will be much
 * faster to calculate so may be desired for quick checks/optimizations.
 * @return {!Rectangle} Rough axis-aligned bounding box for Drawable.
 */
Drawable.prototype.getAABB = function () {
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
};

/**
 * Return the best Drawable bounds possible without performing graphics queries.
 * I.e., returns the tight bounding box when the convex hull points are already
 * known, but otherwise return the rough AABB of the Drawable.
 * @return {!Rectangle} Bounds for the Drawable.
 */
Drawable.prototype.getFastBounds = function () {
    if (!this.needsConvexHullPoints()) {
        return this.getBounds();
    }
    return this.getAABB();
};

/**
 * Calculate a color to represent the given ID number. At least one component of
 * the resulting color will be non-zero if the ID is not Drawable.NONE.
 * @param {int} id The ID to convert.
 * @returns {number[]} An array of [r,g,b,a], each component in the range [0,1].
 */
Drawable.color4fFromID = function(id) {
    id -= Drawable.NONE;
    var r = ((id >> 0) & 255) / 255.0;
    var g = ((id >> 8) & 255) / 255.0;
    var b = ((id >> 16) & 255) / 255.0;
    return [r, g, b, 1.0];
};

/**
 * Calculate the ID number represented by the given color. If all components of
 * the color are zero, the result will be Drawable.NONE; otherwise the result
 * will be a valid ID.
 * @param {int} r The red value of the color, in the range [0,255].
 * @param {int} g The green value of the color, in the range [0,255].
 * @param {int} b The blue value of the color, in the range [0,255].
 * @param {int} a The alpha value of the color, in the range [0,255].
 * @returns {int} The ID represented by that color.
 */
// eslint-disable-next-line no-unused-vars
Drawable.color4bToID = function(r, g, b, a) {
    var id;
    id = (r & 255) << 0;
    id |= (g & 255) << 8;
    id |= (b & 255) << 16;
    return id + Drawable.NONE;
};
