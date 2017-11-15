/**
 * @fileoverview
 * A representation of a Skin's silhouette that can test if a point on the skin
 * renders a pixel where it is drawn.
 */

/**
 * <canvas> element used to update Silhouette data from skin bitmap data.
 * @type {CanvasElement}
 */
let __SilhouetteUpdateCanvas;

class Silhouette {
    constructor () {
        /**
         * The width of the data representing the current skin data.
         * @type {number}
         */
        this._width = 0;

        /**
         * The height of the data representing the current skin date.
         * @type {number}
         */
        this._height = 0;

        /**
         * The data representing a skin's silhouette shape.
         * @type {Uint8ClampedArray}
         */
        this._data = null;
    }

    /**
     * Update this silhouette with the bitmapData for a skin.
     * @param {*} bitmapData An image, canvas or other element that the skin
     * rendering can be queried from.
     */
    update (bitmapData) {
        const canvas = Silhouette._updateCanvas();
        const width = this._width = canvas.width = bitmapData.width;
        const height = this._height = canvas.height = bitmapData.height;
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(bitmapData, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);

        this._data = new Uint8ClampedArray(imageData.data.length / 4);

        for (let i = 0; i < imageData.data.length; i += 4) {
            this._data[i / 4] = imageData.data[i + 3];
        }
    }

    /**
     * Does this point touch the silhouette?
     * @param {twgl.v3} vec A texture coordinate.
     * @return {boolean} Did the point touch?
     */
    isTouching (vec) {
        const x = Math.floor(vec[0] * this._width);
        const y = Math.floor(vec[1] * this._height);
        return (
            x < this._width && x >= 0 &&
            y < this._height && y >= 0 &&
            this._data[(y * this._width) + x] !== 0);
    }

    /**
     * Get the canvas element reused by Silhouettes to update their data with.
     * @private
     * @return {CanvasElement} A canvas to draw bitmap data to.
     */
    static _updateCanvas () {
        if (typeof __SilhouetteUpdateCanvas === 'undefined') {
            __SilhouetteUpdateCanvas = document.createElement('canvas');
        }
        return __SilhouetteUpdateCanvas;
    }
}

module.exports = Silhouette;
