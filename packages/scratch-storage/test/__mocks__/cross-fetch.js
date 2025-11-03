const TextEncoder = require('util').TextEncoder;
const crossFetch = jest.requireActual('cross-fetch');
const knownAssets = require('../fixtures/known-assets.js');

const Headers = crossFetch.Headers;
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
    /** @type MockFetchResponse */
    const results = {
        ok: false,
        status: 0
    };
    if (options?.mockFetchTestData) {
        options.mockFetchTestData.headers = new Headers(options.headers);
        options.mockFetchTestData.headersCount = Array.from(options.mockFetchTestData.headers).length;
    }

    const assetInfo = knownAssets[resource];
    if (assetInfo) {
        results.ok = true;
        results.status = 200;
        results.arrayBuffer = () => Promise.resolve(assetInfo.content);
    } else {
        switch (resource) {
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

// Mimic the cross-fetch module, but replace its `fetch` with `mockFetch` and add a few extras

module.exports = exports = mockFetch;
exports.fetch = mockFetch;
exports.Headers = crossFetch.Headers;
exports.Request = crossFetch.Request;
exports.Response = crossFetch.Response;
exports.successText = successText;

// Needed for TypeScript consumers without esModuleInterop.
exports.default = mockFetch;
