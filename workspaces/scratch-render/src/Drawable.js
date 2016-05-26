var twgl = require('twgl.js');
var svgToImage = require('svg-to-image');
var xhr = require('xhr');

/**
 * An object which can be drawn by the renderer.
 * TODO: double-buffer all rendering state (position, skin, shader index, etc.)
 * @param renderer The renderer which owns this Drawable.
 * @param gl The OpenGL context.
 * @constructor
 */
function Drawable(renderer, gl) {
    this._id = Drawable._nextDrawable++;
    Drawable._allDrawables[this._id] = this;

    this._renderer = renderer;
    this._gl = gl;

    /**
     * The uniforms to be used by the vertex and pixel shaders.
     * Some of these are used by other parts of the renderer as well.
     * @type {Object.<string,*>}
     * @private
     */
    this._uniforms = {
        /**
         * The model-view-projection matrix.
         * @type {module:twgl/m4.Mat4}
         */
        u_mvp: twgl.m4.identity(),

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
        u_texture: null
    };

    // Effect values are uniforms too
    var numEffects = Drawable.EFFECTS.length;
    for (var index = 0; index < numEffects; ++index) {
        var effectName = Drawable.EFFECTS[index];
        var converter = Drawable._effectConverter[effectName];
        this._uniforms['u_' + effectName] = converter(0);
    }

    this._position = twgl.v3.create(0, 0);
    this._scale = 100;
    this._direction = 90;
    this._transformDirty = true;
    this._shaderIndex = 0;

    this.setSkin(Drawable._DEFAULT_SKIN);
}

module.exports = Drawable;

/**
 * Mapping of each effect to a conversion function. The conversion function
 * takes a Scratch value (generally in the range 0..100 or -100..100) and maps
 * it to a value useful to the shader.
 * @type {Object.<string,function>}
 * @private
 */
Drawable._effectConverter = {
    color: function(x) {
        return (x / 200) % 1;
    },
    fisheye: function(x) {
        return Math.max(0, (x + 100) / 100);
    },
    whirl: function(x) {
        return x * Math.PI / 180;
    },
    pixelate: function(x) {
        return Math.abs(x) / 10;
    },
    mosaic: function(x) {
        x = Math.round((Math.abs(x) + 10) / 10);
        // TODO: cap by Math.min(srcWidth, srcHeight)
        return Math.max(1, Math.min(x, 512));
    },
    brightness: function(x) {
        return Math.max(-100, Math.min(x, 100)) / 100;
    },
    ghost: function(x) {
        return 1 - Math.max(0, Math.min(x, 100)) / 100;
    }
};

/**
 * The name of each supported effect.
 * @type {Array}
 */
Drawable.EFFECTS = Object.keys(Drawable._effectConverter);

/**
 * The cache of all shaders compiled so far. These are generated on demand.
 * @type {Array}
 * @private
 */
Drawable._shaderCache = [];

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
Drawable._DEFAULT_SKIN = {
    squirrel: '7e24c99c1b853e52f8e7f9004416fa34.png',
    bus: '66895930177178ea01d9e610917f8acf.png',
    scratch_cat: '09dc888b0b7df19f70d81588ae73420e.svg'
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
        this._gl.deleteTexture(this._uniforms.u_texture);
    }
    if (skin_md5ext) {
        var ext = skin_md5ext.substring(skin_md5ext.indexOf('.')+1);
        switch (ext) {
        case 'svg':
        case 'svgz':
            this._setSkinSVG(skin_md5ext);
            break;
        default:
            this._setSkinBitmap(skin_md5ext);
            break;
        }
    }
    else {
        this._uniforms.u_texture = null;
    }
};

/**
 * Fetch the shader for this Drawable's set of active effects.
 * Build the shader if necessary.
 * @returns {module:twgl.ProgramInfo?} The shader's program info.
 */
Drawable.prototype.getShader = function () {
    var shader = Drawable._shaderCache[this._shaderIndex];
    if (!shader) {
        shader = Drawable._shaderCache[this._shaderIndex] =
            this._buildShader();
    }
    return shader;
};

/**
 * Build the shader for this Drawable's set of active effects.
 * @returns {module:twgl.ProgramInfo?} The new shader's program info.
 * @private
 */
Drawable.prototype._buildShader = function () {
    var defines = [];
    var numEffects = Drawable.EFFECTS.length;

    for (var index = 0; index < numEffects; ++index) {
        if ((this._shaderIndex & (1 << index)) != 0) {
            defines.push('#define ENABLE_' + Drawable.EFFECTS[index]);
        }
    }

    var definesText = defines.join('\n') + '\n';
    var vsFullText = definesText + require('./shaders/sprite.vert');
    var fsFullText = definesText + require('./shaders/sprite.frag');

    return twgl.createProgramInfo(this._gl, [vsFullText, fsFullText]);
};

/**
 * Load a bitmap skin. Supports the same formats as the Image element.
 * @param {string} skin_md5ext The MD5 and file extension of the bitmap skin.
 * @private
 */
Drawable.prototype._setSkinBitmap = function (skin_md5ext) {
    var url =
        'https://cdn.assets.scratch.mit.edu/internalapi/asset/' +
        skin_md5ext +
        '/get/';
    this._setSkinCore(url, 2);
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
    var url =
        'https://cdn.assets.scratch.mit.edu/internalapi/asset/' +
        skin_md5ext +
        '/get/';
    var instance = this;
    function gotSVG(err, response, body) {
        if (!err) {
            svgToImage(body, gotImage);
        }
    }
    function gotImage(err, image) {
        if (!err) {
            instance._setSkinCore(image, 1);
        }
    }
    xhr.get({
        useXDR: true,
        url: url
    }, gotSVG);
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
        if (!err) {
            instance._uniforms.u_texture = texture;
            instance._setSkinSize(
                source.width, source.height, costumeResolution);
        }
    };

    var options = {
        auto: true,
        mag: this._gl.NEAREST,
        min: this._gl.NEAREST, // TODO: mipmaps, linear (except pixelate)
        src: source
    };
    var willCallCallback = typeof source == 'string';
    var texture = twgl.createTexture(
        this._gl, options, willCallCallback ? callback : null);

    // If we don't already have a texture, or if we won't get a callback when
    // the new one loads, then just start using the texture immediately.
    if (willCallCallback) {
        if (!this._uniforms.u_texture) {
            this._uniforms.u_texture = texture;
            this._setSkinSize(0, 0);
        }
    }
    else {
        callback(null, texture, source);
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
 * Update the position, direction, scale, or effect properties of this Drawable.
 * @param {Object.<string,*>} properties The new property values to set.
 */
Drawable.prototype.updateProperties = function (properties) {
    var dirty = false;
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
    if ('scale' in properties && this._scale != properties.scale) {
        this._scale = properties.scale;
        dirty = true;
    }
    if (dirty) {
        this.setTransformDirty();
    }
    var numEffects = Drawable.EFFECTS.length;
    for (var index = 0; index < numEffects; ++index) {
        var propertyName = Drawable.EFFECTS[index];
        if (propertyName in properties) {
            var rawValue = properties[propertyName];
            var mask = 1 << index;
            if (rawValue != 0) {
                this._shaderIndex |= mask;
            }
            else {
                this._shaderIndex &= ~mask;
            }
            var converter = Drawable._effectConverter[propertyName];
            this._uniforms['u_' + propertyName] = converter(rawValue);
        }
    }
};

/**
 * Set the dimensions of this Drawable's skin.
 * @param {int} width The width of the new skin.
 * @param {int} height The height of the new skin.
 * @param {int} costumeResolution The resolution to use for this skin.
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
};

/**
 * Calculate the transform to use when rendering this Drawable.
 * @private
 */
Drawable.prototype._calculateTransform = function () {
    var mvp = this._uniforms.u_mvp;

    var projection = this._renderer.getProjectionMatrix();
    twgl.m4.translate(projection, this._position, mvp);

    var rotation = (270 - this._direction) * Math.PI / 180;
    twgl.m4.rotateZ(mvp, rotation, mvp);

    var scaledSize = twgl.v3.mulScalar(
        this._uniforms.u_skinSize, this._scale / 100);
    scaledSize[2] = 0; // was NaN because u_skinSize has only 2 components
    twgl.m4.scale(mvp, scaledSize, mvp);

    this._transformDirty = false;
};
