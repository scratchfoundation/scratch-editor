/**
 * Shared helpers for detecting and filtering external URL references in SVG
 * attributes and CSS.
 */

const {generate, parse, walk} = require('css-tree');
const {ident} = require('css-tree/utils');

/**
 * Return true if a URL string is an internal document reference (fragment) or
 * a data URI.  Everything else is considered external.
 * @param {string} ref URL string to test.
 * @returns {boolean} true if the ref is a fragment identifier or data URI.
 */
const isInternalRef = ref =>
    ref.startsWith('#') || ref.toLowerCase().startsWith('data:');

/**
 * Check if raw CSS text contains an external url() reference via regex.
 * Used for Raw nodes (e.g. custom property values) that css-tree doesn't
 * fully parse.
 * @param {string} text raw CSS text to check.
 * @returns {boolean} true if an external url() reference was found.
 */
const rawTextHasExternalUrls = text => {
    const normalized = text.toLowerCase().replace(/\s/g, '');
    const urlPattern = /url\((.+?)\)/g;
    let match;
    while ((match = urlPattern.exec(normalized)) !== null) {
        const ref = match[1].replace(/['"]/g, '');
        if (!isInternalRef(ref)) return true;
    }
    return false;
};

/**
 * Walk a css-tree AST and return true if any Url node references an external
 * resource.  Also checks Raw nodes, which css-tree produces for custom
 * property values and other unparsed content that could still contain url()
 * references.
 * @param {import('css-tree').CssNode} ast css-tree AST node.
 * @returns {boolean} true if an external url() reference was found.
 */
const astHasExternalUrls = ast => {
    let found = false;
    walk(ast, node => {
        if (node.type === 'Url') {
            const urlValue = node.value.trim().replace(/['"]/g, '');
            if (!isInternalRef(urlValue)) {
                found = true;
            }
        }
        if (node.type === 'Raw' && rawTextHasExternalUrls(node.value)) {
            found = true;
        }
    });
    return found;
};

/**
 * Canonicalize a CSS string and check it for external url() references.
 * Decodes CSS escapes then parses through css-tree so that all syntax
 * variations (quoting, whitespace, comments, escapes) are normalized into AST
 * nodes.
 * @param {string} cssText raw CSS text.
 * @param {string} parseContext css-tree parse context: 'value' for a single
 *   CSS value (presentation attributes like fill, stroke), or
 *   'declarationList' for style attributes.
 * @returns {boolean} true if an external url() reference was found.
 */
const cssHasExternalUrls = (cssText, parseContext) => {
    const decoded = ident.decode(cssText);
    try {
        return astHasExternalUrls(parse(decoded, {context: parseContext}));
    } catch {
        // If css-tree can't parse it, conservatively check the decoded text.
        // This handles edge cases where creative syntax breaks the parser but
        // a browser might still interpret a url() call.
        return rawTextHasExternalUrls(decoded);
    }
};

/**
 * Parse a CSS string, remove external-URL declarations and optionally
 * `@import` rules, and return the cleaned string.  Decodes CSS escapes before
 * parsing so that obfuscated references (e.g. `\75\72\6c(…)`) are caught.
 *
 * Throws if css-tree cannot parse the input — callers are responsible for
 * handling parse errors according to their own security policy.
 * @param {string} cssText raw CSS text.
 * @param {string|null} parseContext css-tree parse context ('declarationList',
 *   'value', etc.).  Pass null for a full stylesheet parse.
 * @param {object} [options] filtering options.
 * @param {boolean} [options.removeImports] also remove CSS `@import` rules.
 * @returns {string} cleaned CSS text.
 */
const filterCssText = (cssText, parseContext, {removeImports = false} = {}) => {
    const decoded = ident.decode(cssText);
    const ast = parse(decoded, parseContext ? {context: parseContext} : {});
    let modified = decoded !== cssText;
    walk(ast, (node, item, list) => {
        if (removeImports && node.type === 'Atrule' &&
            node.name.toLowerCase() === 'import') {
            list.remove(item);
            modified = true;
        }
        if (node.type === 'Declaration' && node.value &&
            astHasExternalUrls(node.value)) {
            list.remove(item);
            modified = true;
        }
    });
    return modified ? generate(ast) : cssText;
};

module.exports = {
    astHasExternalUrls,
    cssHasExternalUrls,
    filterCssText,
    isInternalRef,
    rawTextHasExternalUrls
};
