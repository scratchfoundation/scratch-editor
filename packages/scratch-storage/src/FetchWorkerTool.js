/**
 * Get and send assets with a worker that uses fetch.
 */
class PrivateFetchWorkerTool {
    constructor () {
        /**
         * What does the worker support of the APIs we need?
         * @type {{fetch:boolean}}
         */
        this._workerSupport = {
            fetch: typeof fetch !== 'undefined'
        };

        /**
         * A possible error occurred standing up the worker.
         * @type {!Error}
         */
        this._supportError = null;

        /**
         * The worker that runs fetch and returns data for us.
         * @type {!Worker}
         */
        this.worker = null;

        /**
         * A map of ids to fetch job objects.
         * @type {object}
         */
        this.jobs = {};

        try {
            if (this.isGetSupported) {
                // eslint-disable-next-line global-require
                const FetchWorker = require('worker-loader?{"inline":true,"fallback":true}!./FetchWorkerTool.worker');

                this.worker = new FetchWorker();

                this.worker.addEventListener('message', ({data}) => {
                    if (data.support) {
                        this._workerSupport = data.support;
                        return;
                    }
                    for (const message of data) {
                        if (this.jobs[message.id]) {
                            if (message.error) {
                                this.jobs[message.id].reject(message.error);
                            } else {
                                this.jobs[message.id].resolve(message.buffer);
                            }
                            delete this.jobs[message.id];
                        }
                    }
                });
            }
        } catch (error) {
            this._supportError = error;
        }
    }

    /**
     * Is get supported?
     *
     * false if the environment does not workers, fetch, or fetch from inside a
     * worker. Finding out the worker supports fetch is asynchronous and will
     * guess that it does if the window does until the worker can inform us.
     * @returns {boolean} Is get supported?
     */
    get isGetSupported () {
        return (
            typeof Worker !== 'undefined' &&
            this._workerSupport.fetch &&
            !this._supportError
        );
    }

    /**
     * Request data from a server with a worker using fetch.
     * @param {{url:string}} reqConfig - Request configuration for data to get.
     * @param {{method:string}} options - Additional options to configure fetch.
     * @returns {Promise.<Buffer>} Resolve to Buffer of data from server.
     */
    get ({url}, options = {method: 'GET'}) {
        return new Promise((resolve, reject) => {
            // TODO: Use a Scratch standard ID generator ...
            const id = Math.random().toString(16)
                .substring(2);
            this.worker.postMessage({
                id,
                url,
                options
            });
            this.jobs[id] = {
                id,
                resolve,
                reject
            };
        })
            .then(body => new Uint8Array(body));
    }

    /**
     * Is sending supported? always false for FetchWorkerTool.
     * @returns {boolean} Is sending supported?
     */
    get isSendSupported () {
        return false;
    }

    /**
     * Send data to a server with nets.
     * @throws {Error} A not implemented error.
     */
    send () {
        throw new Error('Not implemented.');
    }

    /**
     * Return a static PrivateFetchWorkerTool instance on demand.
     * @returns {PrivateFetchWorkerTool} A static PrivateFetchWorkerTool
     *   instance
     */
    static get instance () {
        if (!this._instance) {
            this._instance = new PrivateFetchWorkerTool();
        }
        return this._instance;
    }
}

/**
 * Get and send assets with a worker that uses fetch.
 */
class PublicFetchWorkerTool {
    constructor () {
        /**
         * Shared instance of an internal worker. PublicFetchWorkerTool proxies
         * it.
         * @type {PrivateFetchWorkerTool}
         */
        this.inner = PrivateFetchWorkerTool.instance;
    }

    /**
     * Is get supported?
     * @returns {boolean} Is get supported?
     */
    get isGetSupported () {
        return this.inner.isGetSupported;
    }

    /**
     * Request data from a server with a worker that uses fetch.
     * @param {{url:string}} reqConfig - Request configuration for data to get.
     * @param {{method:string}} options - Additional options to configure fetch.
     * @returns {Promise.<Buffer>} Resolve to Buffer of data from server.
     */
    get (reqConfig, options) {
        return this.inner.get(reqConfig, options);
    }

    /**
     * Is sending supported?
     * @returns {boolean} Is sending supported?
     */
    get isSendSupported () {
        return false;
    }

    /**
     * Send data to a server with a worker that uses fetch.
     * @throws {Error} A not implemented error.
     */
    send () {
        throw new Error('Not implemented.');
    }
}

module.exports = PublicFetchWorkerTool;
