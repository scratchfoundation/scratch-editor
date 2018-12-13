/**
 * Fixup svg string prior to parsing.
 * @param {!string} svgString String of the svg to fix.
 * @returns {!string} fixed svg that should be parseable.
 */
module.exports = function (svgString) {
    // Add root svg namespace if it does not exist.
    const svgAttrs = svgString.match(/<svg [^>]*>/);
    if (svgAttrs && svgAttrs[0].indexOf('xmlns=') === -1) {
        svgString = svgString.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    }

    // There are some SVGs from Illustrator that use undeclared entities.
    // Just replace those entities with fake namespace references to prevent
    // DOMParser from crashing
    if (svgAttrs && svgAttrs[0].indexOf('&ns_') !== -1 && svgString.indexOf('<!DOCTYPE') === -1) {
        svgString = svgString.replace(svgAttrs[0],
            svgAttrs[0].replace(/&ns_[^;]+;/g, 'http://ns.adobe.com/Extensibility/1.0/'));
    }

    // The <metadata> element is not needed for rendering and sometimes contains
    // unparseable garbage from Illustrator :(
    // Note: [\s\S] matches everything including newlines, which .* does not
    svgString = svgString.replace(/<metadata>[\s\S]*<\/metadata>/, '');

    return svgString;
};
