const SvgElement = require('./svg-element');
/**
 * @fileOverview Import bitmap data into Scratch 3.0, resizing image as necessary.
 */
const {FONTS} = require('scratch-render-fonts');

/**
 * Given SVG data, inline the fonts. This allows them to be rendered correctly when set
 * as the source of an HTMLImageElement. Here is a note from tmickel:
 *   // Inject fonts that are needed.
 *   // It would be nice if there were another way to get the SVG-in-canvas
 *   // to render the correct font family, but I couldn't find any other way.
 *   // Other things I tried:
 *   // Just injecting the font-family into the document: no effect.
 *   // External stylesheet linked to by SVG: no effect.
 *   // Using a <link> or <style>@import</style> to link to font-family
 *   // injected into the document: no effect.
 * @param {SVGElement} svgTag The SVG dom object
 * @return {void}
 */
const inlineSvgFonts = function (svgTag) {
    // Collect fonts that need injection.
    const fontsNeeded = new Set();
    const collectFonts = function collectFonts (domElement) {
        if (domElement.getAttribute && domElement.getAttribute('font-family')) {
            fontsNeeded.add(domElement.getAttribute('font-family'));
        }
        for (let i = 0; i < domElement.childNodes.length; i++) {
            collectFonts(domElement.childNodes[i]);
        }
    };
    collectFonts(svgTag);
    const newDefs = SvgElement.create('defs');
    const newStyle = SvgElement.create('style');
    for (const font of fontsNeeded) {
        if (FONTS.hasOwnProperty(font)) {
            newStyle.textContent += FONTS[font];
        }
    }
    newDefs.appendChild(newStyle);
    svgTag.insertBefore(newDefs, svgTag.childNodes[0]);
};

module.exports = inlineSvgFonts;
