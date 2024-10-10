import {Headers, applyMetadata} from './scratchFetch';
import {ScratchGetRequest, Tool} from './Tool';

interface DeferredJob {
    id: string,
    resolve: (buffer: ArrayBuffer) => void;
    reject: (error: unknown) => void;
}

/**
 * Get and send assets with a worker that uses fetch.
 */
class PrivateFetchWorkerTool implements Tool {
    private _workerSupport: {fetch: boolean};
    private _supportError: unknown;
    private worker: Worker | null;
    private jobs: Record<string, DeferredJob | undefined>;

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
         * @type {Error?}
         */
        this._supportError = null;

        /**
         * The worker that runs fetch and returns data for us.
         * @type {Worker?}
         */
        this.worker = null;

        /**
         * A map of ids to fetch job objects.
         * @type {object}
         */
        this.jobs = {};

        try {
            if (this.isGetSupported) {
                // Yes, this is a browser API and we've specified `browser: false` in the eslint env,
                // but `isGetSupported` checks for the presence of Worker and uses it only if present.
                // Also see https://webpack.js.org/guides/web-workers/
                // eslint-disable-next-line no-undef
                const worker = new Worker(
                    /* webpackChunkName: "fetch-worker" */ new URL('./FetchWorkerTool.worker', import.meta.url)
                );

                worker.addEventListener('message', ({data}) => {
                    if (data.support) {
                        this._workerSupport = data.support;
                        return;
                    }
                    for (const message of data) {
                        const job = this.jobs[message.id];
                        if (job) {
                            if (message.error) {
                                job.reject(message.error);
                            } else {
                                job.resolve(message.buffer);
                            }
                            delete this.jobs[message.id];
                        }
                    }
                });

                this.worker = worker;
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
    get isGetSupported (): boolean {
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
     * @returns {Promise.<Buffer|Uint8Array|null>} Resolve to Buffer of data from server.
     */
    get ({url, ...options}: ScratchGetRequest): Promise<Uint8Array | null> {
        const worker = this.worker;

        if (!worker) {
            return Promise.reject(new Error('The worker could not be initialized'));
        }

        return new Promise<ArrayBuffer>((resolve, reject) => {
            // TODO: Use a Scratch standard ID generator ...
            const id = Math.random().toString(16)
                .substring(2);
            const augmentedOptions = applyMetadata(
                Object.assign({method: 'GET'}, options)
            );
            // the Fetch spec says options.headers could be:
            // "A Headers object, an object literal, or an array of two-item arrays to set request's headers."
            // structured clone (postMessage) doesn't support Headers objects
            // so turn it into an array of two-item arrays to make it to the worker intact
            if (augmentedOptions && augmentedOptions.headers instanceof Headers) {
                augmentedOptions.headers = Array.from(augmentedOptions.headers.entries());
            }

            worker.postMessage({
                id,
                url,
                options: augmentedOptions
            });
            this.jobs[id] = {
                id,
                resolve,
                reject
            };
        })
            /* eslint no-confusing-arrow: ["error", {"allowParens": true}] */
            .then(body => (body ? new Uint8Array(body) : null));
    }

    /**
     * Is sending supported? always false for FetchWorkerTool.
     * @returns {boolean} Is sending supported?
     */
    get isSendSupported (): boolean {
        return false;
    }

    /**
     * Send data to a server.
     * @throws {Error} A not implemented error.
     */
    send (): never {
        throw new Error('Not implemented.');
    }

    private static _instance?: PrivateFetchWorkerTool;

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
export default class PublicFetchWorkerTool {
    private inner: PrivateFetchWorkerTool;

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
    get isGetSupported (): boolean {
        return this.inner.isGetSupported;
    }

    /**
     * Request data from a server with a worker that uses fetch.
     * @param {{url:string}} reqConfig - Request configuration for data to get.
     * @returns {Promise.<Buffer|Uint8Array|null>} Resolve to Buffer of data from server.
     */
    get (reqConfig: ScratchGetRequest): Promise<Uint8Array | null> {
        return this.inner.get(reqConfig);
    }

    /**
     * Is sending supported?
     * @returns {boolean} Is sending supported?
     */
    get isSendSupported (): boolean {
        return false;
    }

    /**
     * Send data to a server with a worker that uses fetch.
     * @throws {Error} A not implemented error.
     */
    send (): never {
        throw new Error('Not implemented.');
    }
}
