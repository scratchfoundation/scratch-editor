const Skin = require('./Skin');
const SVGMIP = require('./SVGMIP');
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

        /** @type {WebGLTexture} */
        this._texture = null;

        /** @type {Array.<SVGMIPs>} */
        this._scaledMIPs = [];

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
        if (this._texture) {
            for (const mip of this._scaledMIPs) {
                if (mip) {
                    mip.dispose();
                }
            }
            this._texture = null;
            this._scaledMIPs.length = 0;
        }
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
     * Create a MIP for a given scale and pass it a callback for updating
     * state when switching between scales and MIPs.
     * @param {number} scale - The relative size of the MIP
     * @param {function} resetCallback - this is a callback for doing a hard reset
     * of MIPs and a reset of the rotation center. Only passed in if the MIP scale is 1.
     * @return {SVGMIP} An object that handles creating and updating SVG textures.
     */
    createMIP (scale, resetCallback) {
        const textureCallback = textureData => {
            if (resetCallback) resetCallback();
            // Check if we have the largest MIP
            // eslint-disable-next-line no-use-before-define
            if (!this._scaledMIPs.length || this._scaledMIPs[this._scaledMIPs.length - 1]._scale <= scale) {
                // Currently silhouette only gets scaled up
                this._silhouette.update(textureData);
            }
        };
        const mip = new SVGMIP(this._renderer, this._svgRenderer, scale, textureCallback);

        return mip;
    }

    /**
     * @param {Array<number>} scale - The scaling factors to be used, each in the [0,100] range.
     * @return {WebGLTexture} The GL texture representation of this skin when drawing at the given scale.
     */
    getTexture (scale) {
        if (!this._svgRenderer.canvas.width || !this._svgRenderer.canvas.height) {
            return super.getTexture();
        }

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

        if (!this._scaledMIPs[textureIndex + INDEX_OFFSET]) {
            this._scaledMIPs[textureIndex + INDEX_OFFSET] = this.createMIP(newScale);
        }

        return this._scaledMIPs[textureIndex + INDEX_OFFSET].getTexture();
    }

    /**
     * Do a hard reset of the existing MIPs by calling dispose(), setting a new
     * scale 1 MIP in this._scaledMIPs, and finally updating the rotationCenter.
     * @param {SVGMIPs} mip - An object that handles creating and updating SVG textures.
     * @param {Array<number>} [rotationCenter] - Optional rotation center for the SVG. If not supplied, it will be
     * calculated from the bounding box
    * @fires Skin.event:WasAltered
     */
    resetMIPs (mip, rotationCenter) {
        this._scaledMIPs.forEach(oldMIP => oldMIP.dispose());
        this._scaledMIPs.length = 0;

        // Set new scale 1 MIP after outdated MIPs have been disposed
        this._texture = this._scaledMIPs[INDEX_OFFSET] = mip;

        if (typeof rotationCenter === 'undefined') rotationCenter = this.calculateRotationCenter();
        this.setRotationCenter.apply(this, rotationCenter);
        this.emit(Skin.Events.WasAltered);
    }

    /**
     * Set the contents of this skin to a snapshot of the provided SVG data.
     * @param {string} svgData - new SVG to use.
     * @param {Array<number>} [rotationCenter] - Optional rotation center for the SVG.
     */
    setSVG (svgData, rotationCenter) {
        this._svgRenderer.loadString(svgData);

        if (!this._svgRenderer.canvas.width || !this._svgRenderer.canvas.height) {
            super.setEmptyImageData();
            return;
        }

        const maxDimension = Math.ceil(Math.max(this.size[0], this.size[1]));
        let testScale = 2;
        for (testScale; maxDimension * testScale <= MAX_TEXTURE_DIMENSION; testScale *= 2) {
            this._maxTextureScale = testScale;
        }

        // Create the 1.0 scale MIP at INDEX_OFFSET.
        const textureScale = 1;
        const mip = this.createMIP(textureScale, () => this.resetMIPs(mip, rotationCenter));
    }

}

module.exports = SVGSkin;
