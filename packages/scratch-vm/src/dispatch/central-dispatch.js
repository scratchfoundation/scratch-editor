const SharedDispatch = require('./shared-dispatch');

const log = require('../util/log');

/**
 * @import {
 *  DispatchCallMessage,
 *  DispatchLocalServiceProvider,
 *  DispatchServiceProvider,
 *  DispatchServiceRecord
 * } from './shared-dispatch'
 */

/**
 * This class serves as the central broker for message dispatch. It expects to operate on the main thread / Window and
 * it must be informed of any Worker threads which will participate in the messaging system. From any context in the
 * messaging system, the dispatcher's "call" method can call any method on any "service" provided in any participating
 * context. The dispatch system will forward function arguments and return values across worker boundaries as needed.
 * @see {WorkerDispatch}
 */
class CentralDispatch extends SharedDispatch {
    constructor () {
        super();

        /**
         * Map of channel name to worker or local service provider.
         * If the entry is a Worker, the service is provided by an object on that worker.
         * Otherwise, the service is provided locally and methods on the service will be called directly.
         * @see {setService}
         * @type {Record<string, DispatchServiceProvider>}
         */
        this.services = {};

        /**
         * List of workers attached to this dispatcher.
         * @type {Worker[]}
         */
        this.workers = [];
    }

    /**
     * Synchronously call a particular method on a particular service provided locally.
     * Calling this function on a remote service will fail.
     * @param {string} service - the name of the service.
     * @param {string} method - the name of the method.
     * @param {unknown[]} args - the arguments to be copied to the method, if any.
     * @returns {unknown} - the return value of the service method.
     */
    callSync (service, method, ...args) {
        const {provider, isRemote} = this._getServiceProvider(service);
        if (provider) {
            if (isRemote) {
                throw new Error(`Cannot use 'callSync' on remote provider for service ${service}.`);
            }

            return SharedDispatch._callLocalMethod(provider, method, args);
        }
        throw new Error(`Provider not found for service: ${service}`);
    }

    /**
     * Synchronously set a local object as the global provider of the specified service.
     * WARNING: Any method on the provider can be called from any worker within the dispatch system.
     * @param {string} service - a globally unique string identifying this service. Examples: 'vm', 'gui', 'extension9'.
     * @param {DispatchLocalServiceProvider} provider - a local object which provides this service.
     */
    setServiceSync (service, provider) {
        if (Object.prototype.hasOwnProperty.call(this.services, service)) {
            log.warn(`Central dispatch replacing existing service provider for ${service}`);
        }
        this.services[service] = provider;
    }

    /**
     * Set a local object as the global provider of the specified service.
     * WARNING: Any method on the provider can be called from any worker within the dispatch system.
     * @param {string} service - a globally unique string identifying this service. Examples: 'vm', 'gui', 'extension9'.
     * @param {DispatchLocalServiceProvider} provider - a local object which provides this service.
     * @returns {Promise<void>} - a promise which will resolve once the service is registered.
     */
    setService (service, provider) {
        /** Return a promise for consistency with {@link WorkerDispatch#setService} */
        try {
            this.setServiceSync(service, provider);
            return Promise.resolve();
        } catch (e) {
            return Promise.reject(e);
        }
    }

    /**
     * Add a worker to the message dispatch system. The worker must implement a compatible message dispatch framework.
     * The dispatcher will immediately attempt to "handshake" with the worker.
     * @param {Worker} worker - the worker to add into the dispatch system.
     */
    addWorker (worker) {
        if (this.workers.indexOf(worker) === -1) {
            this.workers.push(worker);
            worker.onmessage = this._onMessage.bind(this, worker);
            this._remoteCall(worker, 'dispatch', 'handshake').catch(e => {
                log.error(`Could not handshake with worker: ${JSON.stringify(e)}`);
            });
        } else {
            log.warn('Central dispatch ignoring attempt to add duplicate worker');
        }
    }

    /**
     * Fetch the service provider object for a particular service name.
     * @override
     * @param {string} service - the name of the service to look up
     * @returns {DispatchServiceRecord} - the means to contact the service, if found
     * @protected
     */
    _getServiceProvider (service) {
        const provider = this.services[service];
        if (provider instanceof Worker) {
            return {
                provider,
                isRemote: true
            };
        }
        return {
            provider,
            isRemote: false
        };
    }

    /**
     * Handle a call message sent to the dispatch service itself
     * @override
     * @param {Worker} worker - the worker which sent the message.
     * @param {DispatchCallMessage} message - the message to be handled.
     * @returns {Promise<unknown>|void} - a promise for the results of this operation, if appropriate
     * @protected
     */
    _onDispatchMessage (worker, message) {
        let promise;
        switch (message.method) {
        case 'setService':
        {
            const serviceName = /** @type {string} */ (message.args[0]);
            promise = this.setService(serviceName, worker);
            break;
        }
        default:
            log.error(`Central dispatch received message for unknown method: ${message.method}`);
        }
        return promise;
    }
}

module.exports = new CentralDispatch();
