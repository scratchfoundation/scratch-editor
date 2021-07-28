const twgl = require('twgl.js');

const Skin = require('./Skin');
const {loadSvgString, serializeSvgToString} = require('scratch-svg-renderer');
const ShaderManager = require('./ShaderManager');

const MAX_TEXTURE_DIMENSION = 2048;

/**
 * All scaled renderings of the SVG are stored in an array. The 1.0 scale of
 * the SVG is stored at the 8th index. The smallest possible 1 / 256 scale
 * rendering is stored at the 0th index.
 * @const {number}
 */
const INDEX_OFFSET = 8;

class SVGSkin extends Skin {
    /**
     * Create a new SVG skin.
     * @param {!int} id - The ID for this Skin.
     * @param {!RenderWebGL} renderer - The renderer which will use this skin.
     * @constructor
     * @extends Skin
     */
    constructor (id, renderer) {
        super(id);

        /** @type {RenderWebGL} */
        this._renderer = renderer;

        /** @type {HTMLImageElement} */
        this._svgImage = document.createElement('img');

        /** @type {boolean} */
        this._svgImageLoaded = false;

        /** @type {Array<number>} */
        this._size = [0, 0];

        /** @type {HTMLCanvasElement} */
        this._canvas = document.createElement('canvas');

        /** @type {CanvasRenderingContext2D} */
        this._context = this._canvas.getContext('2d');

        /** @type {Array<WebGLTexture>} */
        this._scaledMIPs = [];

        /** @type {number} */
        this._largestMIPScale = 0;

        /**
        * Ratio of the size of the SVG and the max size of the WebGL texture
        * @type {Number}
        */
        this._maxTextureScale = 1;
    }

    /**
     * Dispose of this object. Do not use it after calling this method.
     */
    dispose () {
        this.resetMIPs();
        super.dispose();
    }

    /**
     * @return {Array<number>} the natural size, in Scratch units, of this skin.
     */
    get size () {
        return [this._size[0], this._size[1]];
    }

    useNearest (scale, drawable) {
        // If the effect bits for mosaic, pixelate, whirl, or fisheye are set, use linear
        if ((drawable.enabledEffects & (
            ShaderManager.EFFECT_INFO.fisheye.mask |
            ShaderManager.EFFECT_INFO.whirl.mask |
            ShaderManager.EFFECT_INFO.pixelate.mask |
            ShaderManager.EFFECT_INFO.mosaic.mask
        )) !== 0) {
            return false;
        }

        // We can't use nearest neighbor unless we are a multiple of 90 rotation
        if (drawable._direction % 90 !== 0) {
            return false;
        }

        // Because SVG skins' bounding boxes are currently not pixel-aligned, the idea here is to hide blurriness
        // by using nearest-neighbor scaling if one screen-space pixel is "close enough" to one texture pixel.
        // If the scale of the skin is very close to 100 (0.99999 variance is okay I guess)
        // TODO: Make this check more precise. We should use nearest if there's less than one pixel's difference
        // between the screen-space and texture-space sizes of the skin. Mipmaps make this harder because there are
        // multiple textures (and hence multiple texture spaces) and we need to know which one to choose.
        if (Math.abs(scale[0]) > 99 && Math.abs(scale[0]) < 101 &&
            Math.abs(scale[1]) > 99 && Math.abs(scale[1]) < 101) {
            return true;
        }
        return false;
    }

    /**
     * Create a MIP for a given scale.
     * @param {number} scale - The relative size of the MIP
     * @return {SVGMIP} An object that handles creating and updating SVG textures.
     */
    createMIP (scale) {
        const [width, height] = this._size;
        this._canvas.width = width * scale;
        this._canvas.height = height * scale;
        if (
            this._canvas.width <= 0 ||
            this._canvas.height <= 0 ||
            // Even if the canvas at the current scale has a nonzero size, the image's dimensions are floored
            // pre-scaling; e.g. if an image has a width of 0.4 and is being rendered at 3x scale, the canvas will have
            // a width of 1, but the image's width will be rounded down to 0 on some browsers (Firefox) prior to being
            // drawn at that scale, resulting in an IndexSizeError if we attempt to draw it.
            this._svgImage.naturalWidth <= 0 ||
            this._svgImage.naturalHeight <= 0
        ) return super.getTexture();
        this._context.clearRect(0, 0, this._canvas.width, this._canvas.height);
        this._context.setTransform(scale, 0, 0, scale, 0, 0);
        this._context.drawImage(this._svgImage, 0, 0);

        // Pull out the ImageData from the canvas. ImageData speeds up
        // updating Silhouette and is better handled by more browsers in
        // regards to memory.
        const textureData = this._context.getImageData(0, 0, this._canvas.width, this._canvas.height);

        const textureOptions = {
            auto: false,
            wrap: this._renderer.gl.CLAMP_TO_EDGE,
            src: textureData,
            premultiplyAlpha: true
        };

        const mip = twgl.createTexture(this._renderer.gl, textureOptions);

        // Check if this is the largest MIP created so far. Currently, silhouettes only get scaled up.
        if (this._largestMIPScale < scale) {
            this._silhouette.update(textureData);
            this._largestMIPScale = scale;
        }

        return mip;
    }

    updateSilhouette (scale = [100, 100]) {
        // Ensure a silhouette exists.
        this.getTexture(scale);
    }

    /**
     * @param {Array<number>} scale - The scaling factors to be used, each in the [0,100] range.
     * @return {WebGLTexture} The GL texture representation of this skin when drawing at the given scale.
     */
    getTexture (scale) {
        // The texture only ever gets uniform scale. Take the larger of the two axes.
        const scaleMax = scale ? Math.max(Math.abs(scale[0]), Math.abs(scale[1])) : 100;
        const requestedScale = Math.min(scaleMax / 100, this._maxTextureScale);

        // Math.ceil(Math.log2(scale)) means we use the "1x" texture at (0.5, 1] scale,
        // the "2x" texture at (1, 2] scale, the "4x" texture at (2, 4] scale, etc.
        // This means that one texture pixel will always be between 0.5x and 1x the size of one rendered pixel,
        // but never bigger than one rendered pixel--this prevents blurriness from blowing up the texture too much.
        const mipLevel = Math.max(Math.ceil(Math.log2(requestedScale)) + INDEX_OFFSET, 0);
        // Can't use bitwise stuff here because we need to handle negative exponents
        const mipScale = Math.pow(2, mipLevel - INDEX_OFFSET);

        if (this._svgImageLoaded && !this._scaledMIPs[mipLevel]) {
            this._scaledMIPs[mipLevel] = this.createMIP(mipScale);
        }

        return this._scaledMIPs[mipLevel] || super.getTexture();
    }

    /**
     * Do a hard reset of the existing MIPs by deleting them.
     */
    resetMIPs () {
        this._scaledMIPs.forEach(oldMIP => this._renderer.gl.deleteTexture(oldMIP));
        this._scaledMIPs.length = 0;
        this._largestMIPScale = 0;
    }

    /**
     * Set the contents of this skin to a snapshot of the provided SVG data.
     * @param {string} svgData - new SVG to use.
     * @param {Array<number>} [rotationCenter] - Optional rotation center for the SVG. If not supplied, it will be
     * calculated from the bounding box
     * @fires Skin.event:WasAltered
     */
    setSVG (svgData, rotationCenter) {
        const svgTag = loadSvgString(svgData);
        const svgText = serializeSvgToString(svgTag, true /* shouldInjectFonts */);
        this._svgImageLoaded = false;

        const {x, y, width, height} = svgTag.viewBox.baseVal;
        // While we're setting the size before the image is loaded, this doesn't cause the skin to appear with the wrong
        // size for a few frames while the new image is loading, because we don't emit the `WasAltered` event, telling
        // drawables using this skin to update, until the image is loaded.
        // We need to do this because the VM reads the skin's `size` directly after calling `setSVG`.
        // TODO: return a Promise so that the VM can read the skin's `size` after the image is loaded.
        this._size[0] = width;
        this._size[1] = height;

        // If there is another load already in progress, replace the old onload to effectively cancel the old load
        this._svgImage.onload = () => {
            if (width === 0 || height === 0) {
                super.setEmptyImageData();
                return;
            }

            const maxDimension = Math.ceil(Math.max(width, height));
            let testScale = 2;
            for (testScale; maxDimension * testScale <= MAX_TEXTURE_DIMENSION; testScale *= 2) {
                this._maxTextureScale = testScale;
            }

            this.resetMIPs();

            if (typeof rotationCenter === 'undefined') rotationCenter = this.calculateRotationCenter();
            // Compensate for viewbox offset.
            // See https://github.com/LLK/scratch-render/pull/90.
            this._rotationCenter[0] = rotationCenter[0] - x;
            this._rotationCenter[1] = rotationCenter[1] - y;

            this._svgImageLoaded = true;

            this.emit(Skin.Events.WasAltered);
        };

        this._svgImage.src = `data:image/svg+xml;utf8,${encodeURIComponent(svgText)}`;
    }

}

module.exports = SVGSkin;
