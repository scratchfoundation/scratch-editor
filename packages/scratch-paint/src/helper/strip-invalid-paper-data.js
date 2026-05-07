/**
 * Drop `data-paper-data` attributes whose value isn't valid JSON. Paper.js
 * synchronously calls JSON.parse on this attribute during importSVG and
 * throws on malformed values, taking down the whole import. The attribute
 * is paper's own serialization metadata; if it can't parse, paper wouldn't
 * have been able to use it.
 *
 * Operates on a parsed Document in place so callers that already have one
 * (e.g. for viewBox extraction) don't pay for a second parse-and-serialize.
 * @param {Document} svgDoc - parsed SVG document; mutated in place.
 * @returns {boolean} true if any attribute was removed (caller should
 *   re-serialize); false if the document was untouched.
 */
const stripInvalidPaperData = function (svgDoc) {
    let modified = false;
    const els = svgDoc.querySelectorAll('[data-paper-data]');
    for (let i = 0; i < els.length; i++) {
        try {
            JSON.parse(els[i].getAttribute('data-paper-data'));
        } catch {
            els[i].removeAttribute('data-paper-data');
            modified = true;
        }
    }
    return modified;
};

export {stripInvalidPaperData};
