import {type QueueOptions} from '@scratch/task-herder';
import {hostQueueManager} from './HostQueues';

export const Headers = globalThis.Headers;

/**
 * Metadata header names.
 * The enum value is the name of the associated header.
 */
export enum RequestMetadata {
    /** The ID of the project associated with this request */
    ProjectId = 'X-Project-ID',
    /** The ID of the project run associated with this request */
    RunId = 'X-Run-ID'
}

export type ScratchFetchOptions = {
    /**
     * The name of the queue to use for this request.
     * If absent, the hostname of the requested URL will be used as the queue name.
     * This is a Scratch-specific extension to the standard RequestInit type.
     */
    queueName?: string;

    /**
     * The options to use when creating the queue for this request.
     * Ignored if a queue with the specified name already exists.
     */
    queueOptions?: QueueOptions;
};

/**
 * Metadata headers for requests.
 */
const metadata = new Headers();

/**
 * Check if there is any metadata to apply.
 * @returns {boolean} true if `metadata` has contents, or false if it is empty.
 */
export const hasMetadata = (): boolean => {
    const searchParams = (
        typeof self !== 'undefined' &&
        self &&
        self.location &&
        self.location.search &&
        self.location.search.split(/[?&]/)
    ) || [];
    if (!searchParams.includes('scratchMetadata=1')) {
        // for now, disable this feature unless scratchMetadata=1
        // TODO: remove this check once we're sure the feature works correctly in production
        return false;
    }
    for (const _ of metadata) {
        return true;
    }
    return false;
};

/**
 * Non-destructively merge any metadata state (if any) with the provided options object (if any).
 * If there is metadata state but no options object is provided, make a new object.
 * If there is no metadata state, return the provided options parameter without modification.
 * If there is metadata and an options object is provided, modify a copy and return it.
 * Headers in the provided options object may override headers generated from metadata state.
 * @param {RequestInit} [options] The initial request options. May be null or undefined.
 * @returns {RequestInit|undefined} the provided options parameter without modification, or a new options object.
 */
export const applyMetadata = (options?: globalThis.RequestInit): globalThis.RequestInit | undefined => {
    if (hasMetadata()) {
        const augmentedOptions = Object.assign({}, options);
        augmentedOptions.headers = new Headers(metadata);
        if (options && options.headers) {
            // the Fetch spec says options.headers could be:
            // "A Headers object, an object literal, or an array of two-item arrays to set request's headers."
            // turn it into a Headers object to be sure of how to interact with it
            const overrideHeaders = options.headers instanceof Headers ?
                options.headers : new Headers(options.headers);
            for (const [name, value] of overrideHeaders.entries()) {
                augmentedOptions.headers.set(name, value);
            }
        }
        return augmentedOptions;
    }
    return options;
};

/**
 * Make a network request.
 * This is a wrapper for the global fetch method, adding some Scratch-specific functionality.
 * @param {RequestInfo|URL} resource The resource to fetch.
 * @param {RequestInit} [requestOptions] Optional object containing custom settings for this request.
 * @param {ScratchFetchOptions} [scratchOptions] Optional Scratch-specific settings for this request.
 * @see {@link https://developer.mozilla.org/docs/Web/API/fetch} for more about the fetch API.
 * @returns {Promise<Response>} A promise for the response to the request.
 */
export const scratchFetch = (
    resource: RequestInfo | URL,
    requestOptions?: globalThis.RequestInit,
    scratchOptions?: ScratchFetchOptions
): Promise<Response> => {
    requestOptions = applyMetadata(requestOptions);

    let queueName = scratchOptions?.queueName;
    if (!queueName) {
        // Normalize resource to a Request object. The `fetch` call will do this anyway, so it's not much extra work,
        // but it guarantees availability of the URL for queue naming.
        resource = new Request(resource, requestOptions);
        queueName = new URL(resource.url).hostname;
    }
    const queue = hostQueueManager.getOrCreate(queueName, scratchOptions?.queueOptions);
    return queue.do(() => fetch(resource, requestOptions));
};

/**
 * Create a new fetch queue with the given identifier and option overrides.
 * If a queue with that identifier already exists, it will be replaced.
 * Queues are automatically created as needed with default options, so
 * there's no need to call this unless you need to override the default queue options.
 * WARNING: If the old queue has is not empty, it may continue to run its tasks in the background.
 * If you need to cancel fetch tasks in that queue before replacing it, do so manually first.
 * @param queueName The name of the queue to create.
 * @param overrides Optional overrides for the default QueueOptions for this specific queue.
 */
export const createQueue = (queueName: string, overrides: Partial<QueueOptions>): void => {
    hostQueueManager.create(queueName, overrides);
};

/**
 * Set the value of a named request metadata item.
 * Setting the value to `null` or `undefined` will NOT remove the item.
 * Use `unsetMetadata` for that.
 * @param {RequestMetadata} name The name of the metadata item to set.
 * @param {any} value The value to set (will be converted to a string).
 */
export const setMetadata = (name: RequestMetadata, value: any): void => {
    metadata.set(name, value);
};

/**
 * Remove a named request metadata item.
 * @param {RequestMetadata} name The name of the metadata item to remove.
 */
export const unsetMetadata = (name: RequestMetadata): void => {
    metadata.delete(name);
};

/**
 * Retrieve a named request metadata item.
 * Only for use in tests. At the time of writing, used in scratch-vm tests.
 * @param {RequestMetadata} name The name of the metadata item to retrieve.
 * @returns {string|null} The value of the metadata item, or `null` if it was not found.
 */
export const getMetadata = (name: RequestMetadata): string | null => metadata.get(name);
