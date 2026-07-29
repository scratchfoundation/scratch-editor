/**
 * Placeholder substituted in library asset URL templates.
 * @type {string}
 */
export const LIBRARY_ASSET_PATH_PLACEHOLDER = '{assetPath}';

/**
 * Default library thumbnail URL template (MIT Scratch asset service shape).
 * Embedders may override via the `libraryAssetUrlTemplate` GUI prop; when unset,
 * LibraryAssetConfigProvider uses this value. Substitute `{assetPath}` only
 * (e.g. `cd21514d0531fdffb22204e0ec5ed84a.svg`).
 * @type {string}
 * @example
 * // assetId "abc123", dataFormat "png" →
 * // https://cdn.assets.scratch.mit.edu/internalapi/asset/abc123.png/get/
 */
export const DEFAULT_LIBRARY_ASSET_URL_TEMPLATE =
    `https://cdn.assets.scratch.mit.edu/internalapi/asset/${LIBRARY_ASSET_PATH_PLACEHOLDER}/get/`;

const resolveLibraryAssetPath = function (assetId, dataFormat) {
    return dataFormat ?
        `${assetId}.${dataFormat}` :
        assetId;
};

/**
 * Build a library thumbnail GET URL from a template and asset identifiers.
 * @param {string} libraryAssetUrlTemplate - URL template from LibraryAssetConfigContext
 *   (same shape as DEFAULT_LIBRARY_ASSET_URL_TEMPLATE), e.g.
 *   `https://cdn.assets.scratch.mit.edu/internalapi/asset/{assetPath}/get/`.
 * @param {string} assetId - Asset id or full md5ext (e.g. "abc123" or "abc123.png")
 * @param {string} [dataFormat] - File extension when assetId is not md5ext
 * @returns {string} Full asset service URI
 */
export const buildLibraryAssetServiceUri = function (libraryAssetUrlTemplate, assetId, dataFormat) {
    const template = libraryAssetUrlTemplate || DEFAULT_LIBRARY_ASSET_URL_TEMPLATE;
    const assetPath = resolveLibraryAssetPath(assetId, dataFormat);
    return template.split(LIBRARY_ASSET_PATH_PLACEHOLDER).join(assetPath);
};
