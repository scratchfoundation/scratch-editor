/**
 * Mock implementation of the fetch function for testing.
 * Since `fetch` is a global, Jest will not automatically mock it from `__mocks__`.
 *
 * // In your test setup file or at the top of your test files:
 * global.fetch = require('../mocks/fetch').default;
 */

const TextEncoder = require('util').TextEncoder;
const knownAssets = require('../fixtures/known-assets.js');

const Headers = global.Headers;
const successText = 'successful response';

/**
 * @typedef MockFetchResponse The Response-like object returned by mockFetch.
 * @property {boolean} ok True if the simulated request was successful, false otherwise.
 * @property {number} status The HTTP status code of the simulated request.
 * @property {() => Promise<string>} [text] A success string if the simulated request succeeded, undefined otherwise.
 * @property {() => Promise<Uint8Array>} [arrayBuffer] Same as `text`, but encoded with UTF-8 if present.
 */

/**
 * @typedef {RequestInit & {mockFetchTestData: MockFetchTestData}} MockFetchRequestInit
 */

/**
 * @typedef MockFetchTestData
 * @property {Headers} [headers] A Headers object initialized with the header info received by mockFetch.
 * @property {number} [headersCount] The number of headers in the 'headers' property.
 */

/**
 * Mock the 'fetch' method from browsers.
 * @param {RequestInfo|URL} resource The (mock) resource to fetch, which will determine the response.
 * @param {MockFetchRequestInit} [options] Optional object containing custom settings for this request.
 * @returns {Promise<MockFetchResponse>} A promise for a Response-like object. Does not fully implement Response.
 */
const mockFetch = (resource, options) => {
    /** @type {MockFetchResponse} */
    const results = {
        ok: false,
        status: 0
    };
    if (options?.mockFetchTestData) {
        options.mockFetchTestData.headers = new Headers(options.headers);
        options.mockFetchTestData.headersCount = Array.from(options.mockFetchTestData.headers).length;
    }
    const request = new Request(resource, options);
    const path = new URL(request.url).pathname.slice(1); // remove leading '/'
    const assetInfo = knownAssets[path];
    if (assetInfo) {
        results.ok = true;
        results.status = 200;
        results.arrayBuffer = () => Promise.resolve(assetInfo.content);
    } else {
        switch (path) {
        case '200':
            results.ok = true;
            results.status = 200;
            results.text = () => Promise.resolve(successText);
            results.arrayBuffer = () => Promise.resolve(new TextEncoder().encode(successText));
            break;
        case '404':
            results.ok = false;
            results.status = 404;
            break;
        case '500':
            results.ok = false;
            results.status = 500;
            break;
        default:
            throw new Error(`mockFetch doesn't know how to download: ${resource}`);
        }
    }
    return Promise.resolve(results);
};

module.exports = {
    fetch: mockFetch,
    successText
};
