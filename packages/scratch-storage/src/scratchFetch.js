const {fetch, Headers} = require('cross-fetch');

/**
 * Metadata header names
 * @enum {string} The enum value is the name of the associated header.
 * @readonly
 */
const RequestMetadata = {
    /** The ID of the project associated with this request */
    ProjectId: 'X-ProjectId',
    /** The ID of the project run associated with this request */
    RunId: 'X-RunId'
};

/**
 * Metadata for requests
 * @type {Map<string, string>}
 */
const metadata = new Map();

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
    if (metadata.size > 0) {
        const augmentedOptions = Object.assign({}, options);
        augmentedOptions.headers = new Headers(Array.from(metadata));
        if (options && options.headers) {
            const overrideHeaders =
                options.headers instanceof Headers ? options.headers : new Headers(options.headers);
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
    return fetch(resource, augmentedOptions);
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

module.exports = {
    default: scratchFetch,

    Headers,
    RequestMetadata,
    applyMetadata,
    scratchFetch,
    setMetadata,
    unsetMetadata
};
