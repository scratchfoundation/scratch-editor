const twgl = require('twgl.js');

class SVGMIP {
    /**
    * Create a new SVG MIP for a given scale.
    * @param {RenderWebGL} renderer - The renderer which this MIP's skin uses.
    * @param {SvgRenderer} svgRenderer - The svg renderer which this MIP's skin uses.
    * @param {number} scale - The relative size of the MIP
    * @param {function} callback - A callback that should always fire after draw()
    * @constructor
    */
    constructor (renderer, svgRenderer, scale, callback) {
        this._renderer = renderer;
        this._svgRenderer = svgRenderer;
        this._scale = scale;
        this._texture = null;
        this._callback = callback;

        this.draw();
    }

    draw () {
        this._svgRenderer._draw(this._scale, () => {
            const textureData = this._getTextureData();
            const textureOptions = {
                auto: false,
                wrap: this._renderer.gl.CLAMP_TO_EDGE,
                src: textureData
            };

            this._texture = twgl.createTexture(this._renderer.gl, textureOptions);
            this._callback(textureData);
        });
    }

    dispose () {
        this._renderer.gl.deleteTexture(this.getTexture());
    }

    getTexture () {
        return this._texture;
    }

    _getTextureData () {
        // Pull out the ImageData from the canvas. ImageData speeds up
        // updating Silhouette and is better handled by more browsers in
        // regards to memory.
        const canvas = this._svgRenderer.canvas;
        const context = canvas.getContext('2d');
        const textureData = context.getImageData(0, 0, canvas.width, canvas.height);

        return textureData;
    }
}

module.exports = SVGMIP;
