// Support both CommonJS (Node / bundler) and plain browser <script> inclusion.
// In browser context, iframe-html.js must be loaded first via a <script> tag
// so that window.IFRAME_HTML is already defined before this script runs.
// The entire module body is wrapped in an IIFE, so that top-level `const`
// declarations don't collide with those in iframe-html.js when both scripts
// share a single browser page scope.
(function () {
    const IFRAME_HTML = typeof module !== 'undefined' ?
        require('./iframe-html').IFRAME_HTML :
        window.IFRAME_HTML;

    const DEFAULT_TIMEOUT_MS = 30000;

    /**
     * A sandboxed iframe that runs caller-provided scripts in an opaque-origin
     * context. The iframe uses `sandbox="allow-scripts"` without
     * `allow-same-origin`, giving it an opaque origin that cannot access the
     * parent's DOM, cookies, or storage. A strict Content-Security-Policy
     * (`default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'`) blocks
     * network requests and external resource loads.
     *
     * The iframe is lazily created on the first `send()` call and reused for
     * all subsequent calls until `destroy()` is called. After `destroy()`, the
     * next `send()` creates a fresh iframe.
     */
    class Sandbox {
    /**
     * @param {string} script JavaScript source that must synchronously
     *     define `window.onSandboxMessage = function (payload) { ... }`.
     *     The function receives a single structured-cloneable value and
     *     must return a result (or a Promise of a result).
     * @param {object} [options] Configuration options.
     * @param {number} [options.timeoutMs] Per-send timeout in
     *     milliseconds (default 30000). Set to 0 to disable.
     */
        constructor (script, {timeoutMs = DEFAULT_TIMEOUT_MS} = {}) {
            // Defensive copy so a caller mutating the original string after construction
            // doesn't affect a sandbox that has already been created but not yet sent.
            this._script = String(script);
            this._timeoutMs = timeoutMs;
            this._iframe = null;
            this._ready = null;
            this._onMessage = null;
            this._pendingTickets = new Map();
            this._scriptSent = false;
            this._nextTicket = 1;
        }

        /**
         * Lazily create the sandboxed iframe and wait for it to load.
         * @returns {Promise<void>}
         */
        _ensureIframe () {
            if (this._ready) return this._ready;

            const iframe = document.createElement('iframe');
            iframe.setAttribute('sandbox', 'allow-scripts');
            iframe.style.display = 'none';
            this._iframe = iframe;

            this._onMessage = event => {
                // The sandboxed iframe (no allow-same-origin) always has an opaque origin,
                // reported as 'null'. Combined with the source check, this is defense-in-depth.
                if (event.origin !== 'null') return;
                if (event.source !== iframe.contentWindow) return;
                const data = event.data;
                if (!data || typeof data.__sandbox_ticket === 'undefined') return;

                const pending = this._pendingTickets.get(data.__sandbox_ticket);
                if (!pending) return;

                this._pendingTickets.delete(data.__sandbox_ticket);
                if (pending.timeoutId !== null) {
                    clearTimeout(pending.timeoutId);
                }

                if (typeof data.__sandbox_error === 'undefined') {
                    pending.resolve(data.__sandbox_result);
                } else {
                    pending.reject(new Error(data.__sandbox_error));
                }
            };

            window.addEventListener('message', this._onMessage);

            this._ready = new Promise((resolve, reject) => {
                iframe.addEventListener('load', () => resolve());
                // The 'error' event on an iframe element is a generic Event, not
                // an ErrorEvent — it has no .message property. Use a static message.
                iframe.addEventListener('error', () => {
                    reject(new Error('Sandbox iframe failed to load'));
                });
            });

            iframe.srcdoc = IFRAME_HTML;
            document.body.appendChild(iframe);

            return this._ready;
        }

        /**
         * Send a payload to the iframe and return the result.
         *
         * The payload can be any structured-cloneable value. If you need to
         * process multiple items in a single round-trip, pass an array as the
         * payload and handle it in your `onSandboxMessage` function.
         * @param {object} payload The value to pass to onSandboxMessage.
         * @returns {Promise<object>} The value returned by onSandboxMessage.
         */
        async send (payload) {
            await this._ensureIframe();

            const ticket = this._nextTicket++;
            const message = {
                __sandbox_payload: payload,
                __sandbox_ticket: ticket
            };

            if (!this._scriptSent) {
                message.__sandbox_script = this._script;
                this._scriptSent = true;
            }

            return new Promise((resolve, reject) => {
                let timeoutId = null;
                if (this._timeoutMs > 0) {
                    timeoutId = setTimeout(() => {
                        this._pendingTickets.delete(ticket);
                        reject(new Error(
                            `Sandbox: timed out after ${this._timeoutMs}ms`
                        ));
                    }, this._timeoutMs);
                }

                this._pendingTickets.set(ticket, {resolve, reject, timeoutId});
                this._iframe.contentWindow.postMessage(message, '*');
            });
        }

        /**
         * Tear down the iframe and reject any in-flight calls.
         * After `destroy()`, the next `send()` lazily creates a fresh iframe.
         */
        destroy () {
            for (const pending of this._pendingTickets.values()) {
                if (pending.timeoutId !== null) {
                    clearTimeout(pending.timeoutId);
                }
                pending.reject(new Error('Sandbox destroyed'));
            }
            this._pendingTickets.clear();

            if (this._onMessage) {
                window.removeEventListener('message', this._onMessage);
                this._onMessage = null;
            }

            if (this._iframe && this._iframe.parentNode) {
                this._iframe.parentNode.removeChild(this._iframe);
            }
            this._iframe = null;
            this._ready = null;
            this._scriptSent = false;
        }
    }

    if (typeof module === 'undefined') {
        window.Sandbox = Sandbox;
    } else {
        module.exports = {Sandbox};
    }
}()); // end IIFE
