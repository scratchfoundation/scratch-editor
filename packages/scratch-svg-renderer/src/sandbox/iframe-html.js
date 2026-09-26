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
 * so there the scripts are embedded as text.
 *
 * Either way, a per-document nonce admits only the tags written here.
 *
 * `index.js` chooses between the two. Neither policy allows `'unsafe-eval'`.
 */

const CSP = "default-src 'none'; style-src 'unsafe-inline'; font-src data:; img-src data:;";

/**
 * Build the frame document.
 * @param {object} scripts Exactly one of the following.
 * @param {string[]} [scripts.urls] Script URLs, resolved against this page.
 * @param {string[]} [scripts.texts] Script sources to embed in the document.
 *     Either way the scripts run in document order, and the frame's `load`
 *     event waits for all of them, so a later script can use an earlier one.
 * @returns {string} The document for `iframe.srcdoc`.
 */
const buildFrameDocument = ({urls, texts}) => {
    const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte =>
        byte.toString(16).padStart(2, '0')).join('');
    let scriptTags;

    if (urls) {
        // Relative URLs in a srcdoc document resolve against the parent page.
        // Resolve them here. Normalization also percent-encodes the quotes and
        // angle brackets that would otherwise escape the src attribute below.
        const absolute = urls.map(url => new URL(url, document.baseURI).href);
        scriptTags = absolute.map(href => `<script nonce="${nonce}" src="${href}"></script>`);
    } else {
        scriptTags = texts.map(text => `<script nonce="${nonce}">${text}</script>`);
    }

    return `<!DOCTYPE html>
<html>
<head>
<meta http-equiv="Content-Security-Policy" content="${CSP} script-src 'nonce-${nonce}';">
</head>
<body>
${scriptTags.join('\n')}
</body>
</html>`;
};

module.exports = {buildFrameDocument};
