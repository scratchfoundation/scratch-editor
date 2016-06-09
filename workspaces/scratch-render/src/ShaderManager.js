var twgl = require('twgl.js');

function ShaderManager(gl) {
    this._gl = gl;

    /**
     * The cache of all shaders compiled so far. These are generated on demand.
     * The outer index represents the draw mode and the inner index the effects.
     * @type {Array.<Array.<module:twgl.ProgramInfo>>}
     * @private
     */
    this._shaderCache = [];

    var drawModes = Object.keys(ShaderManager.DRAW_MODE);
    var shaderCache = this._shaderCache;
    function initCache(index, mask) {
        if (index >= drawModes.length) {
            shaderCache[mask] = shaderCache[mask] || [];
        }
        else {
            var drawModeName = drawModes[index];

            // Fill high index first to potentially reduce array resize count
            initCache(index+1, mask | ShaderManager.DRAW_MODE[drawModeName]);
            initCache(index+1, mask);
        }
    }
    initCache(0, 0);
}

module.exports = ShaderManager;

/**
 * Mapping of each effect name to info about that effect.
 * The info includes:
 * - The bit in 'effectBits' representing the effect.
 * - A conversion function which takes a Scratch value (generally in the range
 *   0..100 or -100..100) and maps it to a value useful to the shader. This
 *   mapping may not be reversible.
 * @type {Object.<string,Object.<string,*>>}
 */
ShaderManager.EFFECT_INFO = {
    color: {
        mask: 1 << 0,
        converter: function(x) {
            return (x / 200) % 1;
        }
    },
    fisheye: {
        mask: 1 << 1,
        converter: function(x) {
            return Math.max(0, (x + 100) / 100);
        }
    },
    whirl: {
        mask: 1 << 2,
        converter: function(x) {
            return x * Math.PI / 180;
        }
    },
    pixelate: {
        mask: 1 << 3,
        converter: function(x) {
            return Math.abs(x) / 10;
        }
    },
    mosaic: {
        mask: 1 << 4,
        converter: function(x) {
            x = Math.round((Math.abs(x) + 10) / 10);
            // TODO: cap by Math.min(srcWidth, srcHeight)
            return Math.max(1, Math.min(x, 512));
        }
    },
    brightness: {
        mask: 1 << 5,
        converter: function(x) {
            return Math.max(-100, Math.min(x, 100)) / 100;
        }
    },
    ghost: {
        mask: 1 << 6,
        converter: function(x) {
            return 1 - Math.max(0, Math.min(x, 100)) / 100;
        }
    }
};

/**
 * The name of each supported effect.
 * @type {Array}
 */
ShaderManager.EFFECTS = Object.keys(ShaderManager.EFFECT_INFO);

/**
 * The available draw modes. May be combined with bitwise OR.
 * @readonly
 * @enum {int}
 */
ShaderManager.DRAW_MODE = {
    /**
     * Draw normally.
     */
    default: 0,

    /**
     * Draw a silhouette using a solid color.
     */
    silhouette: 1 << 0,

    /**
     * Draw only the parts of the drawable which match a particular color.
     */
    colorMask: 1 << 1
};

/**
 * Fetch the shader for a particular set of active effects.
 * Build the shader if necessary.
 * @param {ShaderManager.DRAW_MODE} drawMode Draw normally, silhouette, etc.
 * @param {int} effectBits Bitmask representing the enabled effects.
 * @returns {module:twgl.ProgramInfo?} The shader's program info.
 */
ShaderManager.prototype.getShader = function (drawMode, effectBits) {
    var cache = this._shaderCache[drawMode];
    if ((drawMode & ShaderManager.DRAW_MODE.silhouette) != 0) {
        // Silhouette mode isn't affected by these effects.
        effectBits &= ~(
            ShaderManager.EFFECT_INFO.color.mask |
            ShaderManager.EFFECT_INFO.brightness.mask
        );
    }
    var shader = cache[effectBits];
    if (!shader) {
        shader = cache[effectBits] = this._buildShader(drawMode, effectBits);
    }
    return shader;
};

/**
 * Build the shader for a particular set of active effects.
 * @param {ShaderManager.DRAW_MODE} drawMode Draw normally, silhouette, etc.
 * @param {int} effectBits Bitmask representing the enabled effects.
 * @returns {module:twgl.ProgramInfo?} The new shader's program info.
 * @private
 */
ShaderManager.prototype._buildShader = function (drawMode, effectBits) {
    var numEffects = ShaderManager.EFFECTS.length;

    var defines = [];
    for (var drawModeName in ShaderManager.DRAW_MODE) {
        if (ShaderManager.DRAW_MODE.hasOwnProperty(drawModeName)) {
            var mask = ShaderManager.DRAW_MODE[drawModeName];
            if ((drawMode & mask) != 0) {
                defines.push('#define DRAW_MODE_' + drawModeName);
            }
        }
    }
    for (var index = 0; index < numEffects; ++index) {
        if ((effectBits & (1 << index)) != 0) {
            defines.push('#define ENABLE_' + ShaderManager.EFFECTS[index]);
        }
    }

    var definesText = defines.join('\n') + '\n';
    var vsFullText = definesText + require('./shaders/sprite.vert');
    var fsFullText = definesText + require('./shaders/sprite.frag');

    return twgl.createProgramInfo(this._gl, [vsFullText, fsFullText]);
};
