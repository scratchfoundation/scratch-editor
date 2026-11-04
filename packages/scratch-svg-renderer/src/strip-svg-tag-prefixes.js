/**
 * Strip the `svg:` namespace prefix (sometimes added by Inkscape) from all tags, e.g. `<svg:path>` becomes `<path>`.
 * DOMPurify parses its input as HTML, which doesn't recognize prefixed tag names, so this must run before DOMPurify.
 * This matches opening and closing tags--the capture group captures the slash if it exists, and it is reinserted in
 * the replacement text.
 * @param {!string} svgString String of the svg to fix.
 * @returns {!string} svg with tag prefixes removed.
 */
module.exports = function (svgString) {
    return svgString.replace(/<(\/?)\s*svg:/g, '<$1');
};
