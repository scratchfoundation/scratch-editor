const crossFetch = require('cross-fetch');

/**
 * Metadata header names
 * @enum {string} The enum value is the name of the associated header.
 * @readonly
 */
const RequestMetadata = {
    /** The ID of the project associated with this request */
    ProjectId: 'X-Project-ID',
    /** The ID of the project run associated with this request */
    RunId: 'X-Run-ID'
};

/**
 * Metadata headers for requests
 * @type {Headers}
 */
const metadata = new crossFetch.Headers();

/**
 * Check if there is any metadata to apply.
 * @returns {boolean} true if `metadata` has contents, or false if it is empty.
 */
const hasMetadata = () => {
    /* global self */
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
const applyMetadata = options => {
    if (hasMetadata()) {
        const augmentedOptions = Object.assign({}, options);
        augmentedOptions.headers = new crossFetch.Headers(metadata);
        if (options && options.headers) {
            // the Fetch spec says options.headers could be:
            // "A Headers object, an object literal, or an array of two-item arrays to set request's headers."
            // turn it into a Headers object to be sure of how to interact with it
            const overrideHeaders = options.headers instanceof crossFetch.Headers ?
                options.headers : new crossFetch.Headers(options.headers);
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
 * @param {RequestInit} options Optional object containing custom settings for this request.
 * @see {@link https://developer.mozilla.org/docs/Web/API/fetch} for more about the fetch API.
 * @returns {Promise<Response>} A promise for the response to the request.
 */
const scratchFetch = (resource, options) => {
    const augmentedOptions = applyMetadata(options);
    return crossFetch.fetch(resource, augmentedOptions);
};

/**
 * Set the value of a named request metadata item.
 * Setting the value to `null` or `undefined` will NOT remove the item.
 * Use `unsetMetadata` for that.
 * @param {RequestMetadata} name The name of the metadata item to set.
 * @param {any} value The value to set (will be converted to a string).
 */
const setMetadata = (name, value) => {
    metadata.set(name, value);
};

/**
 * Remove a named request metadata item.
 * @param {RequestMetadata} name The name of the metadata item to remove.
 */
const unsetMetadata = name => {
    metadata.delete(name);
};

/**
 * Retrieve a named request metadata item.
 * Only for use in tests. At the time of writing, used in scratch-vm tests.
 * @param {RequestMetadata} name The name of the metadata item to retrieve.
 * @returns {any} value The value of the metadata item, or `undefined` if it was not found.
 */
const getMetadata = name => metadata.get(name);

module.exports = {
    Headers: crossFetch.Headers,
    RequestMetadata,
    applyMetadata,
    scratchFetch,
    setMetadata,
    unsetMetadata,
    getMetadata
};
