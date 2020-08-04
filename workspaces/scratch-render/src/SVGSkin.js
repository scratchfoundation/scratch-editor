const twgl = require('twgl.js');

const Skin = require('./Skin');
const SvgRenderer = require('scratch-svg-renderer').SVGRenderer;

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

        /** @type {SvgRenderer} */
        this._svgRenderer = new SvgRenderer();

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
        return this._svgRenderer.size;
    }

    /**
     * Create a MIP for a given scale.
     * @param {number} scale - The relative size of the MIP
     * @return {SVGMIP} An object that handles creating and updating SVG textures.
     */
    createMIP (scale) {
        this._svgRenderer.draw(scale);

        // Pull out the ImageData from the canvas. ImageData speeds up
        // updating Silhouette and is better handled by more browsers in
        // regards to memory.
        const canvas = this._svgRenderer.canvas;
        // If one of the canvas dimensions is 0, set this MIP to an empty image texture.
        // This avoids an IndexSizeError from attempting to getImageData when one of the dimensions is 0.
        if (canvas.width === 0 || canvas.height === 0) return super.getTexture();

        const context = canvas.getContext('2d');
        const textureData = context.getImageData(0, 0, canvas.width, canvas.height);

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

        if (this._svgRenderer.loaded && !this._scaledMIPs[mipLevel]) {
            this._scaledMIPs[mipLevel] = this.createMIP(mipScale);
        }

        return this._scaledMIPs[mipLevel] || super.getTexture();
    }

    /**
     * Do a hard reset of the existing MIPs by deleting them.
     * @param {Array<number>} [rotationCenter] - Optional rotation center for the SVG. If not supplied, it will be
     * calculated from the bounding box
     * @fires Skin.event:WasAltered
     */
    resetMIPs () {
        this._scaledMIPs.forEach(oldMIP => this._renderer.gl.deleteTexture(oldMIP));
        this._scaledMIPs.length = 0;
        this._largestMIPScale = 0;
    }

    /**
     * Set the contents of this skin to a snapshot of the provided SVG data.
     * @param {string} svgData - new SVG to use.
     * @param {Array<number>} [rotationCenter] - Optional rotation center for the SVG.
     */
    setSVG (svgData, rotationCenter) {
        this._svgRenderer.loadSVG(svgData, false, () => {
            const svgSize = this._svgRenderer.size;
            if (svgSize[0] === 0 || svgSize[1] === 0) {
                super.setEmptyImageData();
                return;
            }

            const maxDimension = Math.ceil(Math.max(this.size[0], this.size[1]));
            let testScale = 2;
            for (testScale; maxDimension * testScale <= MAX_TEXTURE_DIMENSION; testScale *= 2) {
                this._maxTextureScale = testScale;
            }

            this.resetMIPs();

            if (typeof rotationCenter === 'undefined') rotationCenter = this.calculateRotationCenter();
            const viewOffset = this._svgRenderer.viewOffset;
            this._rotationCenter[0] = rotationCenter[0] - viewOffset[0];
            this._rotationCenter[1] = rotationCenter[1] - viewOffset[1];

            this.emit(Skin.Events.WasAltered);
        });
    }

}

module.exports = SVGSkin;
