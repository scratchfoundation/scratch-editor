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

    /**
     * Is sending supported? false if the environment does not support sending
     * with fetch.
     * @returns {boolean} Is sending supported?
     */
    get sendSupported () {
        return typeof fetch !== 'undefined';
    }

    /**
     * Send data to a server with fetch.
     * @param {{url:string}} reqConfig - Request configuration for data to send.
     * @param {*} data - Data to send.
     * @param {string} method - HTTP method to sending the data as.
     * @returns {Promise.<string>} Server returned metadata.
     */
    send ({url}, data, method) {
        return fetch(url, {
            method,
            body: data
        })
            .then(result => result.text());
    }
}

module.exports = FetchTool;
