class CanvasMeasurementProvider {
    /**
     * @param {CanvasRenderingContext2D} ctx - provides a canvas rendering context
     * with 'font' set to the text style of the text to be wrapped.
     */
    constructor (ctx) {
        this._ctx = ctx;
        this._cache = {};
    }


    // We don't need to set up or tear down anything here. Should these be removed altogether?

    /**
     * Called by the TextWrapper before a batch of zero or more calls to measureText().
     */
    beginMeasurementSession () {
        
    }

    /**
     * Called by the TextWrapper after a batch of zero or more calls to measureText().
     */
    endMeasurementSession () {
        
    }

    /**
     * Measure a whole string as one unit.
     * @param {string} text - the text to measure.
     * @returns {number} - the length of the string.
     */
    measureText (text) {
        if (!this._cache[text]) {
            this._cache[text] = this._ctx.measureText(text).width;
        }
        return this._cache[text];
    }
}

module.exports = CanvasMeasurementProvider;
