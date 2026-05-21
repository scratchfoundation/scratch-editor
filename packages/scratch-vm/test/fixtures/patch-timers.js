/**
 * Patches global timer functions to track intervals and timeouts created
 * during a block of code, so callers can detect leaks after cleanup.
 *
 * Usage:
 *   const timers = patchTimers();
 *   // ... run code that may create timers ...
 *   vm.quit();
 *   timers.restore();
 *   for (const id of timers.getLiveTimers()) { ... }
 *
 * @returns {{
 *   origSetTimeout: typeof setTimeout,
 *   restore: function(): void,
 *   getLiveTimers: function(): any[]
 * }}
 */
const patchTimers = function () {
    const createdIntervals = new Set();
    const createdTimeouts = new Set();
    const g = /** @type {any} */ (global);
    const origSetInterval = g.setInterval;
    const origClearInterval = g.clearInterval;
    const origSetTimeout = g.setTimeout;
    const origClearTimeout = g.clearTimeout;

    g.setInterval = function () {
        const id = origSetInterval.apply(this, arguments);
        createdIntervals.add(id);
        return id;
    };
    g.clearInterval = function (/** @type {any} */ id) {
        createdIntervals.delete(id);
        return origClearInterval(id);
    };
    g.setTimeout = function () {
        const id = origSetTimeout.apply(this, arguments);
        createdTimeouts.add(id);
        return id;
    };
    g.clearTimeout = function (/** @type {any} */ id) {
        createdTimeouts.delete(id);
        return origClearTimeout(id);
    };

    return {
        /** The unpatched setTimeout, safe to use without leak tracking. */
        origSetTimeout,

        /** Restores the original global timer functions. */
        restore () {
            g.setInterval = origSetInterval;
            g.clearInterval = origClearInterval;
            g.setTimeout = origSetTimeout;
            g.clearTimeout = origClearTimeout;
        },

        /**
         * Returns timer objects that were created but not cleared.
         * Call after vm.quit() and restore() to find leaks.
         * @returns {any[]}
         */
        getLiveTimers () {
            return [
                ...[...createdIntervals].filter(id => !id._destroyed),
                ...[...createdTimeouts].filter(id => !id._destroyed)
            ];
        }
    };
};

module.exports = patchTimers;
