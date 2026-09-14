/**
 * Builds the document for a sandboxed iframe's `srcdoc`: a `<meta>` CSP
 * followed by the caller's scripts. See `runner.js` for what those scripts do.
 *
 * A srcdoc frame inherits the CSP of the page that created it and cannot relax
 * it. So on a page with a strict `script-src`, an inline script in the frame
 * will not run, and the scripts have to be loaded by URL instead.
 *
 * That does not work on `file://` hosts. The frame has an opaque origin, and
 * such frames cannot load local files. Those hosts send no CSP of their own,
 * so there the scripts are embedded as text and allowed by `'unsafe-inline'`.
 *
 * `index.js` chooses between the two. Neither policy allows `'unsafe-eval'`.
 */

const CSP = "default-src 'none'; style-src 'unsafe-inline'; font-src data:; img-src data:;";

/**
 * Build the frame document. The two delivery forms are separate parameters
 * because one document cannot carry both: its policy names either the asset
 * origins or `'unsafe-inline'`.
 * @param {object} scripts Exactly one of the following.
 * @param {string[]} [scripts.urls] Script URLs, resolved against this page.
 * @param {string[]} [scripts.texts] Script sources to embed in the document.
 *     Either way the scripts run in document order, and the frame's `load`
 *     event waits for all of them, so a later script can use an earlier one.
 * @returns {string} The document for `iframe.srcdoc`.
 */
const buildFrameDocument = ({urls, texts}) => {
    let scriptSrc;
    let scriptTags;

    if (urls) {
        // Relative URLs in a srcdoc document resolve against the parent page.
        // Resolve them here so the policy can name their origins; normalization
        // also percent-encodes the quotes and angle brackets that would
        // otherwise escape the src attribute below.
        const absolute = urls.map(url => new URL(url, document.baseURI).href);
        const origins = absolute.map(href => new URL(href).origin);
        scriptSrc = `script-src ${Array.from(new Set(origins)).join(' ')};`;
        scriptTags = absolute.map(href => `<script src="${href}"></script>`);
    } else {
        // Inline handlers in attacker-supplied SVG run under this too, and can
        // post a forged reply for another in-flight call. Accepted: file:// hosts
        // only, same-project costume data, no escape from the opaque origin.
        scriptSrc = "script-src 'unsafe-inline';";
        scriptTags = texts.map(text => `<script>${text}</script>`);
    }

    return `<!DOCTYPE html>
<html>
<head>
<meta http-equiv="Content-Security-Policy" content="${CSP} ${scriptSrc}">
</head>
<body>
${scriptTags.join('\n')}
</body>
</html>`;
};

module.exports = {buildFrameDocument};
