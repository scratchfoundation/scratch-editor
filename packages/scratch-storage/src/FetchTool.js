/* eslint-env browser */

/**
 * Get and send assets with the fetch standard web api.
 */
class FetchTool {
    /**
     * Is get supported? false if the environment does not support fetch.
     * @returns {boolean} Is get supported?
     */
    get getSupported () {
        return typeof fetch !== 'undefined';
    }

    /**
     * Request data from a server with fetch.
     * @param {{url:string}} reqConfig - Request configuration for data to get.
     * @param {{method:string}} options - Additional options to configure fetch.
     * @returns {Promise.<Uint8Array>} Resolve to Buffer of data from server.
     */
    get ({url}, options = {method: 'GET'}) {
        return fetch(url, options)
            .then(result => result.arrayBuffer())
            .then(body => new Uint8Array(body));
    }
}

module.exports = FetchTool;
