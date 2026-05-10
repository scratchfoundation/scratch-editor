/**
 * HTML template injected into sandboxed iframes via `srcdoc`.
 *
 * The iframe receives:
 *   - A strict Content-Security-Policy via <meta> (default-src 'none';
 *     script-src 'unsafe-inline' 'unsafe-eval').
 *   - A runner <script> that:
 *       1. Waits for `message` events from the parent.
 *       2. If `__sandbox_script` is present, evaluates it to define
 *          `window.onSandboxMessage`. The script is sent only with the
 *          first message; subsequent messages reuse the handler.
 *       3. Invokes `onSandboxMessage` with the payload and posts the
 *          result back.
 *       4. Reports errors back to the parent as `{__sandbox_error: message}`.
 *
 * Messages use `__sandbox_payload` / `__sandbox_result`
 * Batching is the caller's responsibility — pass an array as the payload
 * and handle it in the `onSandboxMessage` function.
 *
 * The caller's script must synchronously assign `window.onSandboxMessage` to a
 * function that accepts a payload and returns a result (or a Promise of a result).
 */
const IFRAME_HTML = `<!DOCTYPE html>
<html>
<head>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval';">
</head>
<body>
<script>
window.addEventListener('message', function (event) {
    try {
        var scriptText = event.data.__sandbox_script;
        var payload = event.data.__sandbox_payload;
        var ticket = event.data.__sandbox_ticket;

        // Evaluate the caller's script if provided. The script is sent only
        // with the first message; subsequent messages reuse the
        // previously-defined onSandboxMessage handler.
        if (scriptText != null) {
            (0, eval)(scriptText);
        }

        if (typeof window.onSandboxMessage !== 'function') {
            throw new Error('Script did not define window.onSandboxMessage');
        }

        // targetOrigin '*' is intentional: this iframe has an opaque origin
        // (sandbox="allow-scripts" without allow-same-origin), so event.origin
        // is always 'null' and cannot be used as a reliable targetOrigin across
        // browsers and serving contexts. The parent-side listener guards with
        // event.source === iframe.contentWindow, providing the necessary filtering.
        Promise.resolve(window.onSandboxMessage(payload)).then(function (result) {
            parent.postMessage({__sandbox_result: result, __sandbox_ticket: ticket}, '*');
        }).catch(function (err) {
            parent.postMessage({
                __sandbox_error: err && err.message || String(err),
                __sandbox_ticket: ticket
            }, '*');
        });
    } catch (err) {
        parent.postMessage({
            __sandbox_error: err && err.message || String(err),
            __sandbox_ticket: event.data && event.data.__sandbox_ticket
        }, '*');
    }
});
</script>
</body>
</html>`;

// Support both CommonJS (Node / bundler) and plain browser <script> inclusion.
if (typeof module === 'undefined') {
    window.IFRAME_HTML = IFRAME_HTML;
} else {
    module.exports = {IFRAME_HTML};
}
