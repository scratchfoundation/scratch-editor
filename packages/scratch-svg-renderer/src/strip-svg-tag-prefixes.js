const SvgElement = require('./svg-element');

const CDATA_START = '<![CDATA[';
const CDATA_END = ']]>';

/**
 * Split a string into alternating segments outside and inside CDATA sections, starting with an outside segment.
 * CDATA sections hold literal text, which can look like tags, e.g. `<text><![CDATA[<svg:path>]]></text>`.
 * This is a single forward pass, so input with many unterminated `<![CDATA[` markers takes linear time. An
 * unterminated CDATA section runs to the end of the string.
 * @param {!string} svgString String of the svg to split.
 * @returns {!Array<string>} segments, with CDATA sections at odd indexes.
 */
const splitCdata = function (svgString) {
    const segments = [];
    let position = 0;
    let start = svgString.indexOf(CDATA_START);
    while (start >= 0) {
        const end = svgString.indexOf(CDATA_END, start + CDATA_START.length);
        const next = end < 0 ? svgString.length : end + CDATA_END.length;
        segments.push(svgString.slice(position, start), svgString.slice(start, next));
        position = next;
        start = svgString.indexOf(CDATA_START, position);
    }
    segments.push(svgString.slice(position));
    return segments;
};

/**
 * Strip SVG namespace prefixes (sometimes added by Inkscape) from all tags, e.g. `<svg:path>` becomes `<path>`.
 * DOMPurify parses its input as HTML, which doesn't recognize prefixed tag names, so this must run before DOMPurify.
 * The `svg:` prefix is always stripped; any other prefix is stripped if the document binds it to the SVG namespace,
 * e.g. `xmlns:foo="http://www.w3.org/2000/svg"`. Prefixes bound to other namespaces are left alone, and CDATA
 * sections are left unchanged.
 * Bindings are collected for the whole document rather than per element scope, so a prefix rebound to another
 * namespace on a descendant is still stripped there. Real-world SVGs don't do this, and DOMPurify still judges the
 * resulting elements as usual.
 * @param {!string} svgString String of the svg to fix.
 * @returns {!string} svg with tag prefixes removed.
 */
module.exports = function (svgString) {
    const segments = splitCdata(svgString);
    const isOutsideCdata = (segment, index) => index % 2 === 0;

    const svgPrefixes = new Set(['svg']);
    for (const segment of segments.filter(isOutsideCdata)) {
        for (const [, prefix, , namespace] of segment.matchAll(/\sxmlns:([A-Za-z_][\w.-]*)\s*=\s*(["'])(.*?)\2/g)) {
            if (namespace === SvgElement.svg) {
                svgPrefixes.add(prefix);
            }
        }
    }

    // This matches opening and closing tags--the first capture group captures the slash if it exists, and it is
    // reinserted in the replacement text.
    return segments.map((segment, index) => (isOutsideCdata(segment, index) ?
        segment.replace(/<(\/?)\s*([A-Za-z_][\w.-]*):/g,
            (tag, slash, prefix) => (svgPrefixes.has(prefix) ? `<${slash}` : tag)) :
        segment
    )).join('');
};
