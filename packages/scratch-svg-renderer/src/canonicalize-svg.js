/**
 * Canonicalize SVG text using SVGO 4 with a security-focused, deny-by-default
 * plugin set.  Strips dangerous elements, attributes, and external references
 * while preserving visual fidelity.
 */

const {ident} = require('css-tree/utils');
const {
    cssHasExternalUrls, filterCssText, isInternalRef, rawTextHasExternalUrls
} = require('./util/svg-url-helpers');

// Cache the SVGO module after first dynamic import.
let _svgoPromise = null;
const getSvgo = () => {
    if (!_svgoPromise) {
        _svgoPromise = import('svgo/browser');
    }
    return _svgoPromise;
};

/**
 * Strip declarations with external url() references from a CSS declaration
 * list string (used for style attributes).  Returns the cleaned string, or
 * an empty string if everything was removed.
 * @param {string} cssText raw CSS declaration list.
 * @returns {string} cleaned CSS text.
 */
const stripExternalUrlDeclarations = cssText => {
    try {
        return filterCssText(cssText, 'declarationList');
    } catch {
        // Unparseable CSS — strip entirely rather than risk external loads.
        return rawTextHasExternalUrls(ident.decode(cssText)) ? '' : cssText;
    }
};

// ── Element / attribute classification ─────────────────────────────────────

/** Elements removed entirely (children discarded). */
const REMOVE_ELEMENTS = new Set([
    'script',
    'foreignObject',
    'foreignobject', // case-normalized variant
    // SVG animation elements
    'animate',
    'animateMotion',
    'animateTransform',
    'animateColor',
    'set'
]);

/** Elements whose wrapper is removed but children are preserved. */
const UNWRAP_ELEMENTS = new Set(['a']);

/** Attributes that carry a direct URI reference. */
const URI_ATTRS = new Set(['href', 'xlink:href']);

/**
 * Normalize an attribute name for security checks.
 *
 * Applies NFKC to collapse full-width and other compatibility equivalents
 * (e.g. ｏｎclick → onclick), then strips U+200C (ZWNJ) and U+200D (ZWJ),
 * which are valid XML name characters and can be embedded invisibly to break
 * naive prefix checks (e.g. on\u200Cclick).  All legitimate SVG attribute
 * names are pure ASCII so these transformations produce no false positives.
 * @param {string} name raw attribute name from the parsed SVG AST.
 * @returns {string} normalized attribute name.
 */
const normalizeAttrName = name =>
    name.normalize('NFKC').replace(/[\u200C\u200D]/g, '');

const isEventHandler = name => /^on/i.test(normalizeAttrName(name));

// ── SVGO custom plugins ───────────────────────────────────────────────────

/**
 * Remove dangerous elements (script, foreignObject, animation) and unwrap
 * anchor elements (preserve children, drop the <a> wrapper).
 */
const removeDangerousElements = {
    name: 'removeDangerousElements',
    fn: () => ({
        element: {
            enter: (node, parentNode) => {
                if (REMOVE_ELEMENTS.has(node.name)) {
                    parentNode.children = parentNode.children.filter(
                        child => child !== node
                    );
                    return;
                }
                if (UNWRAP_ELEMENTS.has(node.name)) {
                    parentNode.children = parentNode.children.flatMap(
                        child => (child === node ? node.children : [child])
                    );
                }
            }
        }
    })
};

/**
 * Remove event-handler attributes (on*) and external href / xlink:href
 * references.  Strip individual external-url declarations from style
 * attributes; remove presentation attributes that reference external URLs.
 */
const removeDangerousAttributes = {
    name: 'removeDangerousAttributes',
    fn: () => ({
        element: {
            enter: node => {
                for (const attr of Object.keys(node.attributes)) {
                    const normalizedAttr = normalizeAttrName(attr);
                    if (isEventHandler(attr)) {
                        delete node.attributes[attr];
                        continue;
                    }

                    // Direct URI attributes (href, xlink:href)
                    if (URI_ATTRS.has(normalizedAttr)) {
                        const val = node.attributes[attr];
                        if (val && !isInternalRef(val.replace(/\s/g, ''))) {
                            delete node.attributes[attr];
                        }
                        continue;
                    }

                    // style attribute — strip only the offending declarations
                    if (normalizedAttr === 'style') {
                        const cleaned = stripExternalUrlDeclarations(
                            node.attributes.style
                        );
                        if (cleaned) {
                            node.attributes.style = cleaned;
                        } else {
                            delete node.attributes.style;
                        }
                        continue;
                    }

                    // Presentation attributes that might carry url()
                    const val = node.attributes[attr];
                    if (val && /url\s*\(/i.test(val) &&
                        cssHasExternalUrls(val, 'value')) {
                        delete node.attributes[attr];
                    }
                }
            }
        }
    })
};

// ── Plugin pipeline ────────────────────────────────────────────────────────

/**
 * Deny-by-default plugin list.  Order matters:
 * 1. Inline styles from <style> before removing <style> elements.
 * 2. Remove <style>, <script>, and other dangerous elements.
 * 3. Strip dangerous attributes and external references.
 * 4. Cleanup metadata, comments, doctypes.
 * 5. Sort attributes for deterministic (fixed-point) output.
 */
const CANONICALIZE_PLUGINS = [
    // Inline CSS from <style> into element style attributes so visual
    // appearance is preserved when we remove <style> elements next.
    {
        name: 'inlineStyles',
        params: {
            onlyMatchedOnce: false,
            removeMatchedSelectors: true
        }
    },
    'removeStyleElement',
    'removeScripts',
    removeDangerousElements,
    removeDangerousAttributes,
    'removeDoctype',
    'removeXMLProcInst',
    'removeComments',
    'removeMetadata',
    'removeEditorsNSData',
    'sortAttrs'
];

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Canonicalize an SVG string for safe consumption.
 *
 * Uses SVGO 4 with a deny-by-default plugin set that strips:
 * - `<script>`, `<style>`, `<foreignObject>`, `<a>`, animation elements
 * - Event-handler attributes (on*)
 * - External `href` / `xlink:href` references
 * - External CSS `url()` references
 *
 * The output is a fixed point: canonicalize(canonicalize(x)) === canonicalize(x).
 *
 * Async because SVGO 4's browser-safe bundle is ESM-only; dynamic import()
 * resolves cleanly under both Node and webpack.
 * @param {string} svgText raw SVG string.
 * @returns {Promise<string>} canonicalized SVG string.
 */
const canonicalizeSvgText = async svgText => {
    const {optimize} = await getSvgo();

    try {
        const result = optimize(svgText, {
            multipass: true,
            plugins: CANONICALIZE_PLUGINS
        });
        return result.data;
    } catch (e) {
        // SVGO's SAX parser is stricter than browser DOMParser and rejects
        // some real-world SVGs (Illustrator custom entities, intentionally
        // malformed attack inputs, etc.).  Return the input unchanged so
        // downstream layers (sanitizeSvgText / the iframe sandbox) still
        // get a chance to process it.

        // TODO: Would we want to deny this SVG entirely, instead of letting it passthrough?

        // eslint-disable-next-line no-console
        console.warn(
            `canonicalizeSvgText: SVGO could not parse input (${e.reason || e.message}); returning unmodified`
        );
        return svgText;
    }
};

module.exports = canonicalizeSvgText;
