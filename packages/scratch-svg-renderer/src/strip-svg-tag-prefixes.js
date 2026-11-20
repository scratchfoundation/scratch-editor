const SvgElement = require('./svg-element');

const TEXT_SECTION_ENDS = {
    '<!--': '-->',
    '<![CDATA[': ']]>'
};

/**
 * Split a string into alternating segments outside and inside comments and CDATA sections, starting with an
 * outside segment. These sections hold text, which can look like tags, e.g. `<text><![CDATA[<svg:path>]]></text>`,
 * and each one can contain the other's start marker, e.g. `<!-- <![CDATA[ -->`.
 * This is a single forward pass, so input with many unterminated start markers takes linear time. An unterminated
 * section runs to the end of the string.
 * @param {!string} svgString String of the svg to split.
 * @returns {!Array<string>} segments, with comments and CDATA sections at odd indexes.
 */
const splitTextSections = function (svgString) {
    const segments = [];
    const startPattern = /<!--|<!\[CDATA\[/g;
    let position = 0;
    let match;
    while ((match = startPattern.exec(svgString)) !== null) {
        const start = match.index;
        const end = svgString.indexOf(TEXT_SECTION_ENDS[match[0]], start + match[0].length);
        const next = end < 0 ? svgString.length : end + TEXT_SECTION_ENDS[match[0]].length;
        segments.push(svgString.slice(position, start), svgString.slice(start, next));
        position = startPattern.lastIndex = next;
    }
    segments.push(svgString.slice(position));
    return segments;
};

/**
 * Strip SVG namespace prefixes (sometimes added by Inkscape) from all tags, e.g. `<svg:path>` becomes `<path>`.
 * DOMPurify parses its input as HTML, which doesn't recognize prefixed tag names, so this must run before DOMPurify.
 * The `svg:` prefix is always stripped; any other prefix is stripped if the document binds it to the SVG namespace,
 * e.g. `xmlns:foo="http://www.w3.org/2000/svg"`. Prefixes bound to other namespaces are left alone, and comments
 * and CDATA sections are left unchanged.
 * Bindings are collected for the whole document rather than per element scope, so a prefix rebound to another
 * namespace on a descendant is still stripped there. Real-world SVGs don't do this, and DOMPurify still judges the
 * resulting elements as usual.
 * @param {!string} svgString String of the svg to fix.
 * @returns {!string} svg with tag prefixes removed.
 */
module.exports = function (svgString) {
    const segments = splitTextSections(svgString);
    const isMarkup = (segment, index) => index % 2 === 0;

    const svgPrefixes = new Set(['svg']);
    for (const segment of segments.filter(isMarkup)) {
        for (const [, prefix, , namespace] of segment.matchAll(/\sxmlns:([A-Za-z_][\w.-]*)\s*=\s*(["'])(.*?)\2/g)) {
            if (namespace === SvgElement.svg) {
                svgPrefixes.add(prefix);
            }
        }
    }

    // This matches opening and closing tags--the first capture group captures the slash if it exists, and it is
    // reinserted in the replacement text.
    return segments.map((segment, index) => (isMarkup(segment, index) ?
        segment.replace(/<(\/?)\s*([A-Za-z_][\w.-]*):/g,
            (tag, slash, prefix) => (svgPrefixes.has(prefix) ? `<${slash}` : tag)) :
        segment
    )).join('');
};
