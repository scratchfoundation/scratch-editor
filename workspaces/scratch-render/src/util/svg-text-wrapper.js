const TextWrapper = require('./text-wrapper');

/**
 * Measure text by using a hidden SVG attached to the DOM.
 * For use with TextWrapper.
 */
class SVGMeasurementProvider {
    /**
     * @param {function} makeTextElement - provides a text node of an SVGElement
     *     with the style of the text to be wrapped.
     */
    constructor (makeTextElement) {
        this._svgRoot = null;
        this._cache = {};
        this.makeTextElement = makeTextElement;
    }

    /**
     * Detach the hidden SVG element from the DOM and forget all references to it and its children.
     */
    dispose () {
        if (this._svgRoot) {
            this._svgRoot.parentElement.removeChild(this._svgRoot);
            this._svgRoot = null;
            this._svgText = null;
        }
    }

    /**
     * Called by the TextWrapper before a batch of zero or more calls to measureText().
     */
    beginMeasurementSession () {
        if (!this._svgRoot) {
            this._init();
        }
    }

    /**
     * Called by the TextWrapper after a batch of zero or more calls to measureText().
     */
    endMeasurementSession () {
        this._svgText.textContent = '';
        this.dispose();
    }

    /**
     * Measure a whole string as one unit.
     * @param {string} text - the text to measure.
     * @returns {number} - the length of the string.
     */
    measureText (text) {
        if (!this._cache[text]) {
            this._svgText.textContent = text;
            this._cache[text] = this._svgText.getComputedTextLength();
        }
        return this._cache[text];
    }

    /**
     * Create a simple SVG containing a text node, hide it, and attach it to the DOM. The text node will be used to
     * collect text measurements. The SVG must be attached to the DOM: otherwise measurements will generally be zero.
     * @private
     */
    _init () {
        const svgNamespace = 'http://www.w3.org/2000/svg';

        const svgRoot = document.createElementNS(svgNamespace, 'svg');
        const svgGroup = document.createElementNS(svgNamespace, 'g');
        const svgText = this.makeTextElement();

        // hide from the user, including screen readers
        svgRoot.setAttribute('style', 'position:absolute;visibility:hidden');

        document.body.appendChild(svgRoot);
        svgRoot.appendChild(svgGroup);
        svgGroup.appendChild(svgText);

        /**
         * The root SVG element.
         * @type {SVGSVGElement}
         * @private
         */
        this._svgRoot = svgRoot;

        /**
         * The leaf SVG element used for text measurement.
         * @type {SVGTextElement}
         * @private
         */
        this._svgText = svgText;
    }
}

/**
 * TextWrapper specialized for SVG text.
 */
class SVGTextWrapper extends TextWrapper {
    /**
     * @param {function} makeTextElement - provides a text node of an SVGElement
     *     with the style of the text to be wrapped.
     */
    constructor (makeTextElement) {
        super(new SVGMeasurementProvider(makeTextElement));
        this.makeTextElement = makeTextElement;
    }

    /**
     * Wrap the provided text into lines restricted to a maximum width. See Unicode Standard Annex (UAX) #14.
     * @param {number} maxWidth - the maximum allowed width of a line.
     * @param {string} text - the text to be wrapped. Will be split on whitespace.
     * @returns {SVGElement} wrapped text node
     */
    wrapText (maxWidth, text) {
        const lines = super.wrapText(maxWidth, text);
        const textElement = this.makeTextElement();
        for (const line of lines) {
            const tspanNode = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            tspanNode.setAttribute('x', '0');
            tspanNode.setAttribute('dy', '1.2em');
            tspanNode.textContent = line;
            textElement.appendChild(tspanNode);
        }
        return textElement;
    }
}

module.exports = SVGTextWrapper;
