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
         * The model matrix, to concat with the projection matrix at draw time.
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
        u_skin: null
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
 * The name of each supported effect.
 * @type {Array}
 */
Drawable.EFFECTS = Object.keys(Drawable._effectConverter);

/**
 * The available draw modes.
 * @readonly
 * @enum {string}
 */
Drawable.DRAW_MODE = {
    default: 'default',
    pick: 'pick'
};

/**
 * The cache of all shaders compiled so far. These are generated on demand.
 * @type {Object.<Drawable.DRAW_MODE, Array.<module:twgl.ProgramInfo>>}
 * @private
 */
Drawable._shaderCache = {};

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
    squirrel: '7e24c99c1b853e52f8e7f9004416fa34.png',
    bus: '66895930177178ea01d9e610917f8acf.png',
    scratch_cat: '09dc888b0b7df19f70d81588ae73420e.svg',
    gradient: 'a49ff276b9b8f997a1ae163992c2c145.png'
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
 * @param {boolean} [skipPendingCheck] If true, don't compare to _pendingSkin.
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
 * Fetch the shader for this Drawable's set of active effects.
 * Build the shader if necessary.
 * @param {Drawable.DRAW_MODE} drawMode Draw normally or for picking, etc.
 * @returns {module:twgl.ProgramInfo?} The shader's program info.
 */
Drawable.prototype.getShader = function (drawMode) {
    var cache = Drawable._shaderCache[drawMode];
    if (!cache) {
        cache = Drawable._shaderCache[drawMode] = [];
    }
    var shader = cache[this._shaderIndex];
    if (!shader) {
        shader = cache[this._shaderIndex] = this._buildShader(drawMode);
    }
    return shader;
};

/**
 * Build the shader for this Drawable's set of active effects.
 * @param {Drawable.DRAW_MODE} drawMode Draw normally or for picking, etc.
 * @returns {module:twgl.ProgramInfo?} The new shader's program info.
 * @private
 */
Drawable.prototype._buildShader = function (drawMode) {
    var numEffects = Drawable.EFFECTS.length;

    var defines = [
        '#define DRAW_MODE_' + drawMode
    ];
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

    // If we don't already have a texture, or if we won't get a callback when
    // the new one loads, then just start using the texture immediately.
    if (willCallCallback) {
        if (!this._uniforms.u_skin) {
            this._uniforms.u_skin = instance._pendingSkin;
            this._setSkinSize(0, 0);
        }
    }
    else {
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
 * Update the position, direction, scale, or effect properties of this Drawable.
 * @param {Object.<string,*>} properties The new property values to set.
 */
Drawable.prototype.updateProperties = function (properties) {
    var dirty = false;
    if ('skin' in properties) {
        this.setSkin(properties.skin);
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
    var modelMatrix = this._uniforms.u_modelMatrix;

    twgl.m4.identity(modelMatrix);
    twgl.m4.translate(modelMatrix, this._position, modelMatrix);

    var rotation = (270 - this._direction) * Math.PI / 180;
    twgl.m4.rotateZ(modelMatrix, rotation, modelMatrix);

    var scaledSize = twgl.v3.mulScalar(
        this._uniforms.u_skinSize, this._scale / 100);
    scaledSize[2] = 0; // was NaN because u_skinSize has only 2 components
    twgl.m4.scale(modelMatrix, scaledSize, modelMatrix);

    this._transformDirty = false;
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
Drawable.color4ubToID = function(r, g, b, a) {
    var id;
    id = (r & 255) << 0;
    id |= (g & 255) << 8;
    id |= (b & 255) << 16;
    return id + Drawable.NONE;
};
