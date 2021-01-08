const loadSvgString = require('./load-svg-string');
const serializeSvgToString = require('./serialize-svg-to-string');

/**
 * Convert a version 2 SVG (Scratch 2.0 "quirks mode") to a version 3 svg (complies with normal SVG standards).
 * @param {string} svgString the SVG string to convert from version 2 SVG.
 * @returns {string} the converted SVG string.
 */
module.exports = svgString => serializeSvgToString(loadSvgString(svgString, true /* fromVersion2 */));
