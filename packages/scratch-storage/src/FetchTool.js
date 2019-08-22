/* eslint-env browser */

/**
 * Get and send assets with the fetch standard web api.
 */
class FetchTool {
    /**
     * Is get supported? false if the environment does not support fetch.
     * @returns {boolean} Is get supported?
     */
    get isGetSupported () {
        return typeof fetch !== 'undefined';
    }

    /**
     * Request data from a server with fetch.
     * @param {{url:string}} reqConfig - Request configuration for data to get.
     * @param {{method:string}} options - Additional options to configure fetch.
     * @returns {Promise.<Uint8Array>} Resolve to Buffer of data from server.
     */
    get ({url, ...options}) {
        return fetch(url, Object.assign({method: 'GET'}, options))
            .then(result => result.arrayBuffer())
            .then(body => new Uint8Array(body));
    }

    /**
     * Is sending supported? false if the environment does not support sending
     * with fetch.
     * @returns {boolean} Is sending supported?
     */
    get isSendSupported () {
        return typeof fetch !== 'undefined';
    }

    /**
     * Send data to a server with fetch.
     * @param {Request} reqConfig - Request configuration for data to send.
     * @returns {Promise.<string>} Server returned metadata.
     */
    send ({url, withCredentials = false, ...options}) {
        return fetch(url, Object.assign({
            credentials: withCredentials ? 'include' : 'omit'
        }, options))
            .then(response => {
                if (response.ok) return response.text();
                return Promise.reject(response.status);
            });
    }
}

module.exports = FetchTool;
