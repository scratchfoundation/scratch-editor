var twgl = require('twgl.js');

/**
 * An object which can be drawn by the renderer.
 * @param renderer The renderer which owns this Drawable.
 * @param gl The OpenGL context.
 * @constructor
 */
function Drawable(renderer, gl) {
    this._id = Drawable._nextDrawable++;
    Drawable._allDrawables[this._id] = this;

    this._renderer = renderer;
    this._gl = gl;

    // TODO: double-buffer uniforms
    this._uniforms = {
        u_texture: null,
        u_mvp: twgl.m4.identity(),
        u_brightness_shift: 0,
        u_hue_shift: 0,
        u_whirl_radians: 0
    };

    this._position = twgl.v3.create(0, 0);
    this._scale = 100;
    this._direction = 90;
    this._dimensions = twgl.v3.create(0, 0);
    this._transformDirty = true;
    this._costumeResolution = 2; // TODO: only for bitmaps

    this.setSkin(this._DEFAULT_SKIN);
}

module.exports = Drawable;

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

/**
 * Dirty the transforms of all Drawables.
 * Call this when the projection matrix changes, for example.
 */
Drawable.dirtyAllTransforms = function () {
    for (var drawableID in Drawable._allDrawables) {
        if (Drawable._allDrawables.hasOwnProperty(drawableID)) {
            var drawable = Drawable._allDrawables[drawableID];
            drawable.setTransformDirty();
        }
    }
};

// TODO: fall back on a built-in skin to protect against network problems
Drawable.prototype._DEFAULT_SKIN = {
    squirrel: '7e24c99c1b853e52f8e7f9004416fa34.png',
    bus: '66895930177178ea01d9e610917f8acf.png'
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
 * The Drawable will briefly use a 1x1 skin while waiting for the
 * @param {string} skin_md5ext The MD5 and file extension of the skin.
 */
Drawable.prototype.setSkin = function (skin_md5ext) {
    // TODO: cache Skins instead of loading each time. Ref count them?
    // TODO: share Skins across Drawables - see also destroy()
    if (this._uniforms.u_texture) {
        this._gl.deleteTexture(this._uniforms);
    }
    if (skin_md5ext) {
        var url =
            'https://cdn.assets.scratch.mit.edu/internalapi/asset/' +
            skin_md5ext +
            '/get/';
        var options = {
            auto: true,
            src: url
        };
        var instance = this;
        var callback = function (err, texture, source) {
            if (!err) {
                instance._uniforms.u_texture = texture;
                instance._setDimensions(source.width, source.height);
            }
        };
        // If we already have a texture, keep it until the new one loads.
        if (this._uniforms.u_texture) {
            twgl.createTexture(this._gl, options, callback);
        }
        else {
            this._uniforms.u_texture =
                twgl.createTexture(this._gl, options, callback);
        }
    }
    else {
        this._uniforms.u_texture = null;
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
 * Set the position of this Drawable.
 * @param {number} x The new X position for this Drawable.
 * @param {number} y The new Y position for this Drawable.
 */
Drawable.prototype.setPosition = function (x, y) {
    if (this._position[0] != x || this._position[1] != y) {
        this._position[0] = x;
        this._position[1] = y;
        this.setTransformDirty();
    }
};

/**
 * Set the direction of this Drawable.
 * @param {number} directionDegrees The direction for this Drawable, in degrees.
 */
Drawable.prototype.setDirection = function (directionDegrees) {
    if (this._direction != directionDegrees) {
        this._direction = directionDegrees;
        this.setTransformDirty();
    }
};

/**
 * Set the scale of this Drawable.
 * @param {number} scalePercent The scale for this Drawable, as a percentage.
 */
Drawable.prototype.setScale = function (scalePercent) {
    if(this._scale != scalePercent) {
        this._scale = scalePercent;
        this.setTransformDirty();
    }
};

/**
 * Set the dimensions of this Drawable's skin.
 * @param {int} width The width of the new skin.
 * @param {int} height The height of the new skin.
 * @private
 */
Drawable.prototype._setDimensions = function (width, height) {
    if (this._dimensions[0] != width || this._dimensions[1] != height) {
        this._dimensions[0] = width;
        this._dimensions[1] = height;
        this.setTransformDirty();
    }
};

/**
 * Calculate the transform to use when rendering this Drawable.
 * @private
 */
Drawable.prototype._calculateTransform = function () {
    var rotation = (270 - this._direction) * Math.PI / 180;
    var scale = this._scale / 100 / this._costumeResolution;
    var projection = this._renderer.getProjectionMatrix();
    var mvp = this._uniforms.u_mvp;
    twgl.m4.translate(projection, this._position, mvp);
    twgl.m4.rotateZ(mvp, rotation, mvp);
    twgl.m4.scale(mvp, twgl.v3.mulScalar(this._dimensions, scale), mvp);
    this._transformDirty = false;
};
