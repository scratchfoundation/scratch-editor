const TextEncoder = require('util').TextEncoder;

const successText = 'successful response';

/**
 * Mock the 'fetch' method from browsers. Ignores the 'options' parameter.
 * @param {string} resource - the (mock) resource to fetch, which will determine the response.
 * @returns {Promise} - a promise for a Response-like object. Does not fully implement Response.
 */
const mockFetch = resource => {
    switch (resource) {
    case '200':
        return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(successText),
            arrayBuffer: () => Promise.resolve(new TextEncoder().encode(successText))
        });
    case '404':
        return Promise.resolve({
            ok: false,
            status: 404
        });
    case '500':
        return Promise.resolve({
            ok: false,
            status: 500
        });
    default:
        throw new Error('unimplemented');
    }
};

module.exports = {
    mockFetch,
    successText
};
