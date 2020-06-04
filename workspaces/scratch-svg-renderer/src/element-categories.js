// Elements that can have paint attributes (e.g. fill and stroke)
// Per the SVG spec, things like fill and stroke apply to shapes and text content elements
// https://www.w3.org/TR/SVG11/painting.html#FillProperty
// https://www.w3.org/TR/SVG11/painting.html#StrokeProperty
const PAINTABLE_ELEMENTS = new Set([
    // Shape elements (https://www.w3.org/TR/SVG11/intro.html#TermShape)
    'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
    // Text content elements (https://www.w3.org/TR/SVG11/intro.html#TermTextContentElement)
    // The actual tag names are `altGlyph` and `textPath`, but we're lowercasing the tag name in isContainerElement,
    // so they should be lowercased here too.
    'altglyph', 'textpath', 'text', 'tref', 'tspan'
]);

// "An element which can have graphics elements and other container elements as child elements."
// https://www.w3.org/TR/SVG11/intro.html#TermContainerElement
const CONTAINER_ELEMENTS = new Set([
    'a', 'defs', 'g', 'marker', 'glyph', 'missing-glyph', 'pattern', 'svg', 'switch', 'symbol'
]);

const isPaintableElement = function (element) {
    return element.tagName && PAINTABLE_ELEMENTS.has(element.tagName.toLowerCase());
};
const isContainerElement = function (element) {
    return element.tagName && CONTAINER_ELEMENTS.has(element.tagName.toLowerCase());
};

module.exports = {
    isPaintableElement,
    isContainerElement
};
