const twgl = require('twgl.js');

const Skin = require('./Skin');
const SvgRenderer = require('scratch-svg-renderer').SVGRenderer;

const MAX_TEXTURE_DIMENSION = 2048;
const MIN_TEXTURE_SCALE = 1 / 256;
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
     * Set the origin, in object space, about which this Skin should rotate.
     * @param {number} x - The x coordinate of the new rotation center.
     * @param {number} y - The y coordinate of the new rotation center.
     */
    setRotationCenter (x, y) {
        const viewOffset = this._svgRenderer.viewOffset;
        super.setRotationCenter(x - viewOffset[0], y - viewOffset[1]);
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
            src: textureData
        };

        const mip = twgl.createTexture(this._renderer.gl, textureOptions);

        // Check if this is the largest MIP created so far. Currently, silhouettes only get scaled up.
        if (this._largestMIPScale < scale) {
            this._silhouette.update(textureData);
            this._largestMIPScale = scale;
        }

        return mip;
    }

    /**
     * @param {Array<number>} scale - The scaling factors to be used, each in the [0,100] range.
     * @return {WebGLTexture} The GL texture representation of this skin when drawing at the given scale.
     */
    getTexture (scale) {
        // The texture only ever gets uniform scale. Take the larger of the two axes.
        const scaleMax = scale ? Math.max(Math.abs(scale[0]), Math.abs(scale[1])) : 100;
        const requestedScale = Math.min(scaleMax / 100, this._maxTextureScale);
        let newScale = 1;
        let textureIndex = 0;

        if (requestedScale < 1) {
            while ((newScale > MIN_TEXTURE_SCALE) && (requestedScale <= newScale * .75)) {
                newScale /= 2;
                textureIndex -= 1;
            }
        } else {
            while ((newScale < this._maxTextureScale) && (requestedScale >= 1.5 * newScale)) {
                newScale *= 2;
                textureIndex += 1;
            }
        }

        if (this._svgRenderer.loaded && !this._scaledMIPs[textureIndex + INDEX_OFFSET]) {
            this._scaledMIPs[textureIndex + INDEX_OFFSET] = this.createMIP(newScale);
        }

        return this._scaledMIPs[textureIndex + INDEX_OFFSET] || super.getTexture();
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
            this.setRotationCenter.apply(this, rotationCenter);
            this.emit(Skin.Events.WasAltered);
        });
    }

}

module.exports = SVGSkin;
