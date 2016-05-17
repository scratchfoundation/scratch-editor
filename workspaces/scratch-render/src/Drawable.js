var twgl = require('twgl.js');

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

Drawable.prototype.dispose = function () {
    this.setSkin(null);
    if (this._id >= 0) {
        delete Drawable[this._id];
    }
};

Drawable.prototype.setTransformDirty = function () {
    this._transformDirty = true;
};

Drawable.prototype.getID = function () {
    return this._id;
};

Drawable.prototype.setSkin = function (skin_md5ext) {
    // TODO: share Skins across Drawables - see also destroy()
    if (this._uniforms.u_texture) {
        this._gl.deleteTexture(this._uniforms);
    }
    if (skin_md5ext) {
        var url =
            'https://cdn.assets.scratch.mit.edu/internalapi/asset/' +
            skin_md5ext +
            '/get/';
        var instance = this;
        this._uniforms.u_texture =
            twgl.createTexture(this._gl, {
                auto: true,
                src: url
            }, function (err, texture, source) {
                if (!err) {
                    instance._dimensions[0] = source.width;
                    instance._dimensions[1] = source.height;
                    instance.setTransformDirty();
                }
            });
    }
    else {
        this._uniforms.u_texture = null;
    }
};

Drawable.prototype.getUniforms = function () {
    if (this._transformDirty) {
        this._calculateTransform();
    }
    return this._uniforms;
};

Drawable.prototype.setPosition = function (x, y) {
    if (this._position[0] != x || this._position[1] != y) {
        this._position[0] = x;
        this._position[1] = y;
        this.setTransformDirty();
    }
};

Drawable.prototype.setDirection = function (directionDegrees) {
    if (this._direction != directionDegrees) {
        this._direction = directionDegrees;
        this.setTransformDirty();
    }
};

Drawable.prototype.setScale = function (scalePercent) {
    if(this._scale != scalePercent) {
        this._scale = scalePercent;
        this.setTransformDirty();
    }
};

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
