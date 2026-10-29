// Bundlers replace `process.env.NODE_ENV` at build time. If one doesn't, the
// browser has no `process`, and the failed read counts as a production build.
const isDevelopmentBuild = () => {
    try {
        return process.env.NODE_ENV === 'development'; // eslint-disable-line no-undef
    } catch {
        return false;
    }
};

/**
 * Whether this host can fetch the frame's scripts by URL. An allowlist: an
 * unknown scheme uses inline delivery, which needs no network.
 *
 * Development builds always use inline delivery. Some browsers block requests
 * from an opaque-origin frame to local addresses, which is where dev servers
 * run, and dev servers send no CSP that would forbid the inline scripts. Any
 * other NODE_ENV, including none, gets the production behaviour, which also
 * works under a strict CSP.
 * @returns {boolean} True if scripts should be delivered by URL.
 */
const usesUrlDelivery = () =>
    !isDevelopmentBuild() &&
    (window.location.protocol === 'http:' || window.location.protocol === 'https:');

module.exports = {usesUrlDelivery};
