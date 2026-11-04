const SvgElement = require('./svg-element');

/**
 * Strip SVG namespace prefixes (sometimes added by Inkscape) from all tags, e.g. `<svg:path>` becomes `<path>`.
 * DOMPurify parses its input as HTML, which doesn't recognize prefixed tag names, so this must run before DOMPurify.
 * The `svg:` prefix is always stripped; any other prefix is stripped if the document binds it to the SVG namespace,
 * e.g. `xmlns:foo="http://www.w3.org/2000/svg"`. Prefixes bound to other namespaces are left alone.
 * @param {!string} svgString String of the svg to fix.
 * @returns {!string} svg with tag prefixes removed.
 */
module.exports = function (svgString) {
    const svgPrefixes = new Set(['svg']);
    for (const [, prefix, , namespace] of svgString.matchAll(/\sxmlns:([A-Za-z_][\w.-]*)\s*=\s*(["'])(.*?)\2/g)) {
        if (namespace === SvgElement.svg) {
            svgPrefixes.add(prefix);
        }
    }

    // This matches opening and closing tags--the first capture group captures the slash if it exists, and it is
    // reinserted in the replacement text.
    return svgString.replace(/<(\/?)\s*([A-Za-z_][\w.-]*):/g,
        (tag, slash, prefix) => (svgPrefixes.has(prefix) ? `<${slash}` : tag));
};
