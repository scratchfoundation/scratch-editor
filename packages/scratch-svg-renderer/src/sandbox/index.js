const {buildFrameDocument} = require('./iframe-html');

// Both forms are bundled: which one is used depends on the host at runtime.
// They are small enough that this costs less than an async constructor would.
const RUNNER_URL = require('./runner.js?resource');
const RUNNER_TEXT = require('./runner.js?source');

const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Whether this host can fetch the frame's scripts by URL. An allowlist: an
 * unknown scheme uses inline delivery, which needs no network.
 * @returns {boolean} True if scripts should be delivered by URL.
 */
const usesUrlDelivery = () =>
    window.location.protocol === 'http:' || window.location.protocol === 'https:';

/**
 * A sandboxed iframe that runs caller-provided scripts. It uses
 * `sandbox="allow-scripts"` without `allow-same-origin`, so it has an opaque
 * origin and cannot reach the parent's DOM, cookies or storage. Its own CSP
 * denies everything else, including `'unsafe-eval'`.
 *
 * Scripts enter as `<script>` tags in the frame document, and messages carry
 * data only. See `iframe-html.js` for the two delivery paths.
 *
 * Lazily created on the first `send()` and reused until `destroy()`.
 */
class Sandbox {
    /**
     * @param {Array<{url?: string, text?: string}>} scripts Scripts to run, in
     *     execution order. Each must carry the form this host uses: `url` for
     *     an emitted asset on http(s), `text` for source embedded in the frame
     *     document elsewhere. Supplying both makes one descriptor work on any
     *     host. Together they must define `window.onSandboxMessage`.
     * @param {object} [options] Configuration options.
     * @param {number} [options.timeoutMs] Per-send timeout in
     *     milliseconds (default 30000). Set to 0 to disable.
     * @param {number} [options.idleTimeoutMs] If greater than 0, the iframe is
     *     destroyed after this many milliseconds with no in-flight calls; the
     *     next `send()` lazily creates a fresh one. Default 0 (never auto-destroy),
     *     which keeps the iframe alive for the lifetime of the page.
     * @param {*} [options.init] Structured-cloneable data delivered to
     *     `window.onSandboxInit` with the first message to each frame, so a
     *     frame recreated after idle teardown receives it again. A frame
     *     script must define `window.onSandboxInit` if this is given.
     */
    constructor (scripts, {timeoutMs = DEFAULT_TIMEOUT_MS, idleTimeoutMs = 0, init} = {}) {
        // Copied so a caller mutating the array or a descriptor after
        // construction cannot change a frame built later by the first send().
        this._scripts = scripts.map(script => ({...script}));
        this._init = init;
        this._timeoutMs = timeoutMs;
        this._idleTimeoutMs = idleTimeoutMs;
        this._iframe = null;
        this._ready = null;
        this._onMessage = null;
        this._pendingTickets = new Map();
        this._initSent = false;
        this._nextTicket = 1;
        this._idleTimerId = null;
    }

    /**
     * Clear any pending idle-teardown timer.
     */
    _clearIdleTimer () {
        if (this._idleTimerId !== null) {
            clearTimeout(this._idleTimerId);
            this._idleTimerId = null;
        }
    }

    /**
     * Schedule destruction of the iframe after the idle window, but only
     * when idle teardown is enabled, an iframe exists, and no calls are in
     * flight. When it fires after a period of inactivity, the iframe is
     * destroyed; the next `send()` lazily recreates it.
     */
    _scheduleIdleTeardown () {
        this._clearIdleTimer();
        if (this._idleTimeoutMs > 0 && this._iframe && this._pendingTickets.size === 0) {
            this._idleTimerId = setTimeout(() => {
                this._idleTimerId = null;
                // A send may have started after the timer was armed; only
                // tear down if still idle.
                if (this._pendingTickets.size === 0) {
                    this.destroy();
                }
            }, this._idleTimeoutMs);
        }
    }

    /**
     * Lazily create the sandboxed iframe and wait for it to load.
     * @returns {Promise<void>}
     */
    _ensureIframe () {
        if (this._ready) return this._ready;

        const byUrl = usesUrlDelivery();
        const required = byUrl ? 'url' : 'text';
        this._scripts.forEach((script, index) => {
            if (typeof script[required] !== 'string') {
                throw new Error(
                    `Sandbox: scripts[${index}] has no '${required}'. This host ` +
                    `(${window.location.protocol}) uses ` +
                    `${byUrl ? 'URL' : 'inline'} delivery.`
                );
            }
        });

        const iframe = document.createElement('iframe');
        iframe.setAttribute('sandbox', 'allow-scripts');
        // Use visibility:hidden instead of display:none so the iframe's
        // rendering tree stays active. This is required for DOM
        // measurement APIs (e.g. getBBox) to return correct values.
        iframe.style.position = 'absolute';
        iframe.style.visibility = 'hidden';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        iframe.style.overflow = 'hidden';
        iframe.style.pointerEvents = 'none';
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

            // The call settled; restart the idle countdown if nothing else
            // is in flight.
            this._scheduleIdleTeardown();
        };

        window.addEventListener('message', this._onMessage);

        this._ready = new Promise((resolve, reject) => {
            // A srcdoc document's load event waits for its classic <script src>
            // tags, so by the time this resolves the frame's scripts have run.
            iframe.addEventListener('load', () => resolve());
            // The 'error' event on an iframe element is a generic Event, not
            // an ErrorEvent — it has no .message property. Use a static message.
            iframe.addEventListener('error', () => {
                reject(new Error('Sandbox iframe failed to load'));
            });
        }).catch(error => {
            // Reset state so a subsequent send() can retry with a fresh iframe.
            this.destroy();
            throw error;
        });

        const scripts = [{url: RUNNER_URL, text: RUNNER_TEXT}].concat(this._scripts);

        iframe.srcdoc = buildFrameDocument(byUrl ?
            {urls: scripts.map(script => script.url)} :
            {texts: scripts.map(script => script.text)});
        document.body.appendChild(iframe);

        return this._ready;
    }

    /**
     * Eagerly create the iframe and deliver its init data, so setup cost is
     * paid ahead of the first real call. Safe to call repeatedly and
     * concurrently with `send()`; a no-op once a frame has been initialised.
     * @returns {Promise<void>} Resolves once the iframe has acknowledged.
     */
    async warmUp () {
        if (this._initSent) return;
        await this.send(null, {warm: true});
    }

    /**
     * Send a payload to the iframe and return the result.
     *
     * The payload can be any structured-cloneable value. If you need to
     * process multiple items in a single round-trip, pass an array as the
     * payload and handle it in your `onSandboxMessage` function.
     * @param {object} payload The value to pass to onSandboxMessage.
     * @param {object} [options] Internal options.
     * @param {boolean} [options.warm] Send a warm-up message that delivers
     *     init data without invoking onSandboxMessage.
     * @returns {Promise<object>} The value returned by onSandboxMessage.
     */
    async send (payload, {warm = false} = {}) {
        // Activity: cancel any pending idle teardown so we never destroy the
        // iframe out from under an imminent send.
        this._clearIdleTimer();
        await this._ensureIframe();

        const ticket = this._nextTicket++;
        const message = warm ?
            {__sandbox_warm: true, __sandbox_ticket: ticket} :
            {__sandbox_payload: payload, __sandbox_ticket: ticket};

        if (!this._initSent) {
            message.__sandbox_init = this._init;
            this._initSent = true;
        }

        return new Promise((resolve, reject) => {
            let timeoutId = null;
            if (this._timeoutMs > 0) {
                timeoutId = setTimeout(() => {
                    this._pendingTickets.delete(ticket);
                    reject(new Error(
                        `Sandbox: timed out after ${this._timeoutMs}ms`
                    ));
                    // The call settled (by timing out); restart the idle
                    // countdown if nothing else is in flight.
                    this._scheduleIdleTeardown();
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
        this._clearIdleTimer();
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
        this._initSent = false;
    }
}

module.exports = {Sandbox, usesUrlDelivery};
