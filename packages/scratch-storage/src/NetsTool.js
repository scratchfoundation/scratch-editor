/**
 * Get and send assets with the npm nets package.
 */
class NetsTool {
    /**
     * Is get supported? false if the environment does not support nets.
     * @returns {boolean} Is get supported?
     */
    get getSupported () {
        return true;
    }

    /**
     * Request data from a server with nets.
     * @param {{url:string}} reqConfig - Request configuration for data to get.
     * @returns {Promise.<Buffer>} Resolve to Buffer of data from server.
     */
    get (reqConfig) {
        return new Promise((resolve, reject) => {
            /* eslint global-require:0 */
            // Wait to evaluate nets and its dependencies until we know we need
            // it as NetsTool may never be used if fetch is available.
            const nets = require('nets');

            nets(Object.assign({
                method: 'get'
            }, reqConfig), (err, resp, body) => {
                // body is a Buffer
                if (err || Math.floor(resp.statusCode / 100) !== 2) {
                    reject(err || resp.statusCode);
                } else {
                    resolve(body);
                }
            });
        });
    }

    /**
     * Is sending supported? false if the environment does not support sending
     * with nets.
     * @returns {boolean} Is sending supported?
     */
    get sendSupported () {
        return true;
    }

    /**
     * Send data to a server with nets.
     * @param {{url:string}} reqConfig - Request configuration for data to send.
     * @param {*} data - Data to send.
     * @param {string} method - HTTP method to sending the data as.
     * @returns {Promise.<Buffer|string|object>} Server returned metadata.
     */
    send (reqConfig, data, method) {
        return new Promise((resolve, reject) => {
            /* eslint global-require:0 */
            // Wait to evaluate nets and its dependencies until we know we need
            // it as NetsTool may never be used if fetch is available.
            const nets = require('nets');

            nets(Object.assign({
                body: data,
                method: method,
                encoding: undefined // eslint-disable-line no-undefined
            }, reqConfig), (err, resp, body) => {
                if (err || Math.floor(resp.statusCode / 100) !== 2) {
                    reject(err || resp.statusCode);
                } else {
                    resolve(body);
                }
            });
        });
    }
}

module.exports = NetsTool;
