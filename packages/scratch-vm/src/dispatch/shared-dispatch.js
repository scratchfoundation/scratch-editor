const log = require('../util/log');

/**
 * @typedef {(value: any) => void} DispatchPromiseResolve
 * @typedef {(e: Error) => void} DispatchPromiseReject
 */

/**
 * @typedef {Worker|DedicatedWorkerGlobalScope|Window} DispatchWorkerContext
 * A context in which the dispatch system operates. Any of:
 * - a Worker object, as seen from the main thread or another worker (Worker)
 * - the global object inside a worker (DedicatedWorkerGlobalScope)
 * - the global object inside the main thread (Window)
 */

/**
 * @typedef {object} DispatchCallMessage - a message to the dispatch system representing a service method call
 * @property {number} responseId - send a response message with this response ID. See {@link DispatchResponseMessage}
 * @property {string} service - the name of the service to be called
 * @property {string} method - the name of the method to be called
 * @property {unknown[]} args - the arguments to be passed to the method
 */

/**
 * @typedef {object} DispatchResponseMessage - a message to the dispatch system representing the results of a call
 * @property {number} responseId - a copy of the response ID from the call which generated this response
 * @property {Error} [error] - if this is truthy, it contains exception info about a failed call
 * @property {unknown} [result] - if `error` is not truthy, this contains the return value of the call (if any)
 */

/**
 * @typedef {DispatchCallMessage|DispatchResponseMessage} DispatchMessage
 * Any message to the dispatch system.
 */

/**
 * @typedef {object} DispatchLocalServiceProvider
 * An object which provides a service to the dispatch system.
 */

/**
 * @typedef {Worker|DispatchLocalServiceProvider} DispatchServiceProvider
 * The means to contact a service: either a worker or a local service provider.
 */

/**
 * @typedef {object} DispatchLocalServiceRecord
 * @property {DispatchLocalServiceProvider} provider - the local object which provides this service
 * @property {false} isRemote - always false for local services
 */

/**
 * @typedef {object} DispatchRemoteServiceRecord
 * @property {Worker} provider - the worker which provides this service
 * @property {true} isRemote - always true for remote services
 */

/**
 * @typedef {DispatchLocalServiceRecord|DispatchRemoteServiceRecord} DispatchServiceRecord
 * A record of a service known to the dispatch system.
 */

/**
 * The SharedDispatch class is responsible for dispatch features shared by
 * {@link CentralDispatch} and {@link WorkerDispatch}.
 */
class SharedDispatch {
    constructor () {
        /**
         * List of callback registrations for promises waiting for a response from a call to a service on another
         * worker. A callback registration is an array of [resolve,reject] Promise functions.
         * Calls to local services don't enter this list.
         * @type {[DispatchPromiseResolve, DispatchPromiseReject][]}
         */
        this.callbacks = [];

        /**
         * The next response ID to be used.
         * @type {number}
         */
        this.nextResponseId = 0;
    }

    /**
     * Call a particular method on a particular service, regardless of whether that service is provided locally or on
     * a worker. If the service is provided by a worker, the `args` will be copied using the Structured Clone
     * algorithm, except for any items which are also in the `transfer` list. Ownership of those items will be
     * transferred to the worker, and they should not be used after this call.
     * @example
     *      dispatcher.call('vm', 'setData', 'cat', 42);
     *      // this finds the worker for the 'vm' service, then on that worker calls:
     *      vm.setData('cat', 42);
     * @param {string} service - the name of the service.
     * @param {string} method - the name of the method.
     * @param {unknown[]} args - the arguments to be copied to the method, if any.
     * @returns {Promise<unknown>} - a promise for the return value of the service method.
     * @throws {Error} if the service is not found or if the called method itself throws.
     */
    call (service, method, ...args) {
        return this.transferCall(service, method, null, ...args);
    }

    /**
     * Call a particular method on a particular service, regardless of whether that service is provided locally or on
     * a worker. If the service is provided by a worker, the `args` will be copied using the Structured Clone
     * algorithm, except for any items which are also in the `transfer` list. Ownership of those items will be
     * transferred to the worker, and they should not be used after this call.
     * @example
     *      dispatcher.transferCall('vm', 'setData', [myArrayBuffer], 'cat', myArrayBuffer);
     *      // this finds the worker for the 'vm' service, transfers `myArrayBuffer` to it, then on that worker calls:
     *      vm.setData('cat', myArrayBuffer);
     * @param {string} service - the name of the service.
     * @param {string} method - the name of the method.
     * @param {Transferable[]|null} [transfer] - objects in `args` to be transferred instead of copied.
     * @param {unknown[]} args - the arguments to be copied to the method, if any.
     * @returns {Promise<unknown>} a promise for the return value of the service method.
     * @throws {Error} Rejects with an error if the service is not found or if the called method itself throws.
     */
    transferCall (service, method, transfer, ...args) {
        try {
            const {provider, isRemote} = this._getServiceProvider(service);
            if (provider) {
                if (isRemote) {
                    return this._remoteTransferCall(provider, service, method, transfer, ...args);
                }

                const result = SharedDispatch._callLocalMethod(provider, method, args);
                return Promise.resolve(result);
            }
            return Promise.reject(new Error(`Service not found: ${service}`));
        } catch (e) {
            return Promise.reject(e);
        }
    }

    /**
     * Fetch a method from a service provider and call it with the given arguments.
     * @param {DispatchLocalServiceProvider} provider - the local service provider object.
     * @param {string} methodName - the name of the method to fetch.
     * @param {unknown[]} args - the arguments to pass to the method.
     * @returns {unknown} - the result of the method call.
     * @throws {Error} if the method does not exist on the provider or if the called method throws.
     * @protected
     */
    static _callLocalMethod (provider, methodName, args) {
        const method = /** @type {Record<string, Function>} */ (provider)[methodName];
        if (typeof method !== 'function') {
            // this is a clearer error message than the default TypeError from `apply`
            throw new Error(`Method not found on this service: ${methodName}`);
        }
        return method.apply(provider, args);
    }

    /**
     * Check if a particular service lives on another worker.
     * @param {string} service - the service to check.
     * @returns {boolean} - true if the service is remote (calls must cross a Worker boundary), false otherwise.
     * @private
     */
    _isRemoteService (service) {
        return this._getServiceProvider(service).isRemote;
    }

    /**
     * Like {@link call}, but force the call to be posted through a particular communication channel.
     * @param {DispatchWorkerContext} provider - send the call through this object's `postMessage` function.
     * @param {string} service - the name of the service.
     * @param {string} method - the name of the method.
     * @param {unknown[]} args - the arguments to be copied to the method, if any.
     * @returns {Promise<unknown>} - a promise for the return value of the service method.
     */
    _remoteCall (provider, service, method, ...args) {
        return this._remoteTransferCall(provider, service, method, null, ...args);
    }

    /**
     * Like {@link transferCall}, but force the call to be posted through a particular communication channel.
     * @param {DispatchWorkerContext} provider - send the call through this object's `postMessage` function.
     * @param {string} service - the name of the service.
     * @param {string} method - the name of the method.
     * @param {Transferable[]|null} [transfer] - objects in `args` to be transferred instead of copied.
     * @param {unknown[]} args - the arguments to be copied to the method, if any.
     * @returns {Promise<unknown>} - a promise for the return value of the service method.
     */
    _remoteTransferCall (provider, service, method, transfer, ...args) {
        return new Promise((resolve, reject) => {
            const responseId = this._storeCallbacks(resolve, reject);

            /** @TODO: remove this hack! this is just here so we don't try to send `util` to a worker */
            if (args.length > 0) {
                /**
                 * @typedef {object} MaybeUtil
                 * @property {function} [yield] - if present, this object might be a `util` object
                 */
                const lastArg = /** @type {MaybeUtil} */ (args[args.length - 1]);

                if (lastArg && typeof lastArg.yield === 'function') {
                    args.pop();
                }
            }

            if (transfer) {
                provider.postMessage({service, method, responseId, args}, {transfer});
            } else {
                provider.postMessage({service, method, responseId, args});
            }
        });
    }

    /**
     * Store callback functions pending a response message.
     * @param {DispatchPromiseResolve} resolve - function to call if the service method returns.
     * @param {DispatchPromiseReject} reject - function to call if the service method throws.
     * @returns {number} - a unique response ID for this set of callbacks. See {@link _deliverResponse}.
     * @protected
     */
    _storeCallbacks (resolve, reject) {
        const responseId = this.nextResponseId++;
        this.callbacks[responseId] = [resolve, reject];
        return responseId;
    }

    /**
     * Deliver call response from a worker. This should only be called as the result of a message from a worker.
     * @param {number} responseId - the response ID of the callback set to call.
     * @param {DispatchResponseMessage} message - the message containing the response value(s).
     * @protected
     */
    _deliverResponse (responseId, message) {
        try {
            const [resolve, reject] = this.callbacks[responseId];
            delete this.callbacks[responseId];
            if (message.error) {
                reject(message.error);
            } else {
                resolve(message.result);
            }
        } catch (e) {
            log.error(`Dispatch callback failed: ${JSON.stringify(e)}`);
        }
    }

    /**
     * Handle a message event received from a connected worker.
     * @param {DispatchWorkerContext} worker - the worker which sent the message, or the global object if
     * running in a worker.
     * @param {MessageEvent<DispatchMessage>} event - the message event to be handled.
     * @protected
     */
    _onMessage (worker, event) {
        const message = event.data;
        let promise;
        if ('service' in message) {
            message.args = message.args || [];
            if (message.service === 'dispatch') {
                promise = this._onDispatchMessage(worker, message);
            } else {
                promise = this.call(message.service, message.method, ...message.args);
            }
        } else if (typeof message.responseId === 'undefined') {
            log.error(`Dispatch caught malformed message from a worker: ${JSON.stringify(event)}`);
        } else {
            this._deliverResponse(message.responseId, message);
        }
        if (promise) {
            if (typeof message.responseId === 'undefined') {
                log.error(`Dispatch message missing required response ID: ${JSON.stringify(event)}`);
            } else {
                promise.then(
                    result => worker.postMessage({responseId: message.responseId, result}),
                    error => worker.postMessage({responseId: message.responseId, error})
                );
            }
        }
    }

    /**
     * Fetch the service provider object for a particular service name.
     * @abstract
     * @param {string} service - the name of the service to look up
     * @returns {DispatchServiceRecord} - the means to contact the service, if found
     * @protected
     */
    _getServiceProvider (service) {
        throw new Error(`Could not get provider for ${service}: _getServiceProvider not implemented`);
    }

    /**
     * Handle a call message sent to the dispatch service itself
     * @abstract
     * @param {DispatchWorkerContext} worker - the worker which sent the message, or the global object if
     * running in a worker.
     * @param {DispatchCallMessage} message - the message to be handled.
     * @returns {Promise<unknown>|void} - a promise for the results of this operation, if appropriate
     * @protected
     */
    _onDispatchMessage (worker, message) {
        throw new Error(`Unimplemented dispatch message handler cannot handle ${message.method} method`);
    }
}

module.exports = SharedDispatch;
