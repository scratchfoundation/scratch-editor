/**
 * Default host for library thumbnail assets (matches MIT Scratch CDN).
 */
export const DEFAULT_LIBRARY_ASSET_HOST = 'https://cdn.assets.scratch.mit.edu';

const normalizeHost = host => (host || DEFAULT_LIBRARY_ASSET_HOST).replace(/\/$/, '');

/**
 * Build a Scratch-shaped library asset GET URL for use in library thumbnails.
 * @param {string} libraryAssetHost - Base URL (no trailing slash), e.g. https://cdn.assets.scratch.mit.edu
 * @param {string} assetId - Asset id or full md5ext (e.g. "abc123" or "abc123.png")
 * @param {string} [dataFormat] - File extension when assetId is not md5ext
 * @returns {string} Full asset service URI
 */
export const buildLibraryAssetServiceUri = function (libraryAssetHost, assetId, dataFormat) {
    const host = normalizeHost(libraryAssetHost);
    const assetPath = dataFormat ?
        `${assetId}.${dataFormat}` :
        assetId;
    return `${host}/internalapi/asset/${assetPath}/get/`;
};
