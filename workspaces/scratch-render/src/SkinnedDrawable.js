const twgl = require('twgl.js');
const xhr = require('xhr');

const Drawable = require('./Drawable');
const SvgRenderer = require('./svg-quirks-mode/svg-renderer');


class SkinnedDrawable extends Drawable {
    /**
     * An object which can be drawn by the renderer with textures generated from static bitmap or vector data.
     * @param {WebGLRenderingContext} gl The OpenGL context.
     * @constructor
     */
    constructor (gl) {
        super(gl);

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
     * Update the position, direction, scale, or effect properties of this Drawable.
     * @param {object.<string,*>} properties The new property values to set.
     */
    updateProperties (properties) {
        super.updateProperties(properties);
        if ('skin' in properties) {
            this.setSkin(properties.skin, properties.costumeResolution);
            this.setConvexHullDirty();
        }
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
