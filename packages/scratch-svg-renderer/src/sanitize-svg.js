/**
 * @fileOverview Sanitize the content of an SVG aggressively, to make it as safe
 * as possible
 */
const fixupSvgString = require('./fixup-svg-string');
const DOMPurify = require('isomorphic-dompurify');
const {cssHasExternalUrls, filterCssText, isInternalRef} = require('./util/svg-url-helpers');

const sanitizeSvg = {};

// Attributes that directly reference a URI (not via CSS url())
const URI_ATTRIBUTES = new Set(['href', 'xlink:href']);

DOMPurify.addHook(
    'beforeSanitizeAttributes',
    currentNode => {
        if (!currentNode || !currentNode.attributes) return currentNode;

        for (let i = currentNode.attributes.length - 1; i >= 0; i--) {
            const attr = currentNode.attributes[i];
            if (!attr.value) continue;

            if (URI_ATTRIBUTES.has(attr.name)) {
                // Direct URI: strip whitespace and check
                if (!isInternalRef(attr.value.replace(/\s/g, ''))) {
                    currentNode.removeAttribute(attr.name);
                }
            } else {
                // CSS value that might contain url()
                const context = attr.name === 'style' ? 'declarationList' : 'value';
                if (cssHasExternalUrls(attr.value, context)) {
                    currentNode.removeAttribute(attr.name);
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
            try {
                const cleaned = filterCssText(node.textContent, null, {removeImports: true});
                if (cleaned !== node.textContent) {
                    node.textContent = cleaned;
                }
            } catch {
                // If CSS parsing fails, remove the style content entirely
                // rather than risk passing through unsanitized CSS.
                node.textContent = '';
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
