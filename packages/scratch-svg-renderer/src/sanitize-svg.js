/**
 * @fileOverview Sanitize the content of an SVG aggressively, to make it as safe
 * as possible
 */
const fixupSvgString = require('./fixup-svg-string');
const {generate, parse, walk} = require('css-tree');
const DOMPurify = require('isomorphic-dompurify');

const sanitizeSvg = {};

const isInternalRef = ref => ref.startsWith('#') || ref.startsWith('data:');

DOMPurify.addHook(
    'beforeSanitizeAttributes',
    currentNode => {

        if (currentNode && currentNode.href && currentNode.href.baseVal) {
            const href = currentNode.href.baseVal.replace(/\s/g, '');
            // "data:" and "#" are valid hrefs
            if (!isInternalRef(href)) {
                // TODO: Those can be in different namespaces than `xlink:`
                if (currentNode.attributes.getNamedItem('xlink:href')) {
                    currentNode.attributes.removeNamedItem('xlink:href');
                    delete currentNode['xlink:href'];
                }
                if (currentNode.attributes.getNamedItem('href')) {
                    currentNode.attributes.removeNamedItem('href');
                    delete currentNode.href;
                }
            }
        }

        // Remove url(...) usages with external references
        if (currentNode && currentNode.attributes) {
            for (let i = currentNode.attributes.length - 1; i >= 0; i--) {
                const attr = currentNode.attributes[i];
                const rawValue = attr.value || '';
                const value = rawValue.toLowerCase().replace(/\s/g, '');
        
                const urlMatch = value.match(/url\((.+?)\)/);
                if (urlMatch) {
                    const ref = urlMatch[1].replace(/['"]/g, '');
                    if (!isInternalRef(ref)) {
                        currentNode.removeAttribute(attr.name);
                    }
                }
            }
        }
    
        return currentNode;
    }
);

DOMPurify.addHook(
    'uponSanitizeElement',
    (node, data) => {
        if (data.tagName === 'style') {
            const ast = parse(node.textContent);
            let isModified = false;

            walk(ast, (astNode, item, list) => {
                // @import rules
                if (astNode.type === 'Atrule' && astNode.name.toLowerCase() === 'import') {
                    list.remove(item);
                    isModified = true;
                }
                
                // Elements using url(...) for external resources
                if (astNode.type === 'Declaration' && astNode.value) {
                    let shouldRemove = false;
                    walk(astNode.value, valueNode => {
                        if (valueNode.type === 'Url') {
                            const urlValue = (valueNode.value.value || '').trim().replace(/['"]/g, '');
    
                            if (!isInternalRef(urlValue)) {
                                shouldRemove = true;
                            }
                        }
                    });

                    if (shouldRemove) {
                        list.remove(item);
                        isModified = true;
                    }
                }
            });

            if (isModified) {
                node.textContent = generate(ast);
            }
        }
    }
);

// Use JS implemented TextDecoder and TextEncoder if it is not provided by the
// browser.
let _TextDecoder;
let _TextEncoder;
if (typeof TextDecoder === 'undefined' || typeof TextEncoder === 'undefined') {
    // Wait to require the text encoding polyfill until we know it's needed.
     
    const encoding = require('fastestsmallesttextencoderdecoder');
    _TextDecoder = encoding.TextDecoder;
    _TextEncoder = encoding.TextEncoder;
} else {
    _TextDecoder = TextDecoder;
    _TextEncoder = TextEncoder;
}

/**
 * Load an SVG Uint8Array of bytes and "sanitize" it
 * @param {!Uint8Array} rawData unsanitized SVG daata
 * @returns {Uint8Array} sanitized SVG data
 */
sanitizeSvg.sanitizeByteStream = function (rawData) {
    const decoder = new _TextDecoder();
    const encoder = new _TextEncoder();
    const sanitizedText = sanitizeSvg.sanitizeSvgText(decoder.decode(rawData));
    return encoder.encode(sanitizedText);
};

/**
 * Load an SVG string and "sanitize" it. This is more aggressive than the handling in
 * fixup-svg-string.js, and thus more risky; there are known examples of SVGs that
 * it will clobber. We use DOMPurify's svg profile, which restricts many types of tag.
 * @param {!string} rawSvgText unsanitized SVG string
 * @returns {string} sanitized SVG text
 */
sanitizeSvg.sanitizeSvgText = function (rawSvgText) {
    let sanitizedText = DOMPurify.sanitize(rawSvgText, {
        USE_PROFILES: {svg: true},
        FORBID_TAGS: ['a', 'audio', 'canvas', 'video'],
        // Allow data URI in image tags (e.g. SVGs converted from bitmap)
        ADD_DATA_URI_TAGS: ['image']
    });

    // Remove partial XML comment that is sometimes left in the HTML
    const badTag = sanitizedText.indexOf(']&gt;');
    if (badTag >= 0) {
        sanitizedText = sanitizedText.substring(5, sanitizedText.length);
    }

    // also use our custom fixup rules
    sanitizedText = fixupSvgString(sanitizedText);
    return sanitizedText;
};

module.exports = sanitizeSvg;
