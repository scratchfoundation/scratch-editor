const SvgElement = require('./svg-element');

// CDATA sections hold literal text, which can look like tags, e.g. `<text><![CDATA[<svg:path>]]></text>`.
const CDATA_PATTERN = /<!\[CDATA\[[\s\S]*?\]\]>/g;

/**
 * Strip SVG namespace prefixes (sometimes added by Inkscape) from all tags, e.g. `<svg:path>` becomes `<path>`.
 * DOMPurify parses its input as HTML, which doesn't recognize prefixed tag names, so this must run before DOMPurify.
 * The `svg:` prefix is always stripped; any other prefix is stripped if the document binds it to the SVG namespace,
 * e.g. `xmlns:foo="http://www.w3.org/2000/svg"`. Prefixes bound to other namespaces are left alone.
 * Bindings are collected for the whole document rather than per element scope, so a prefix rebound to another
 * namespace on a descendant is still stripped there. Real-world SVGs don't do this, and DOMPurify still judges the
 * resulting elements as usual.
 * @param {!string} svgString String of the svg to fix.
 * @returns {!string} svg with tag prefixes removed.
 */
module.exports = function (svgString) {
    const svgPrefixes = new Set(['svg']);
    const declarations = svgString.replace(CDATA_PATTERN, '')
        .matchAll(/\sxmlns:([A-Za-z_][\w.-]*)\s*=\s*(["'])(.*?)\2/g);
    for (const [, prefix, , namespace] of declarations) {
        if (namespace === SvgElement.svg) {
            svgPrefixes.add(prefix);
        }
    }

    // Match CDATA sections first so they're returned unchanged. Otherwise, this matches opening and closing tags--the
    // first capture group captures the slash if it exists, and it is reinserted in the replacement text.
    const tagOrCdataPattern = new RegExp(`${CDATA_PATTERN.source}|<(/?)\\s*([A-Za-z_][\\w.-]*):`, 'g');
    return svgString.replace(tagOrCdataPattern,
        (match, slash, prefix) => (prefix && svgPrefixes.has(prefix) ? `<${slash}` : match));
};
