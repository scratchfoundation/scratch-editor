const fs = require('fs');
const path = require('path');

const md5 = require('js-md5');

/**
 * @typedef {object} KnownAsset
 * @property {Buffer} content - The content of the asset.
 * @property {string} hash - The MD5 hash of the asset content.
 */

/**
 * @typedef {{[id: string]: KnownAsset}} KnownAssetCollection
 */

const projects = [
    '117504922'
];
const assets = [
    '66895930177178ea01d9e610917f8acf.png',
    '6e8bd9ae68fdb02b7e1e3df656a75635.svg',
    '7e24c99c1b853e52f8e7f9004416fa34.png',
    '83c36d806dc92327b9e7049a565c6bff.wav',
    'f88bf1935daea28f8ca098462a31dbb0.svg',
    'fe5e3566965f9de793beeffce377d054.jpg'
];

/**
 * Load a file from disk, then return its content and hash.
 * @param {string} filename - The file to load
 * @returns {KnownAsset} The loaded asset
 */
const loadSomething = filename => {
    const fullPath = path.join(__dirname, 'assets', filename);
    const content = fs.readFileSync(fullPath);

    return {
        content,
        hash: md5(content)
    };
};

/**
 * Load a project from disk, ensure it's valid JSON, then return its content and hash.
 * @param {string} id - The project ID
 * @returns {KnownAsset} The loaded project asset
 */
const loadProject = id => {
    const filename = `${id}.json`;
    const result = loadSomething(filename);

    // throw if not a valid JSON string
    JSON.parse(result.content.toString());

    return result;
};

/**
 * Load an asset from disk, ensuring its hash matches its filename.
 * @param {string} filename - The file to load
 * @returns {KnownAsset} The loaded asset
 */
const loadAsset = filename => {
    const result = loadSomething(filename);

    const expectedHash = filename.split('.', 1)[0];
    if (expectedHash !== result.hash) {
        throw new Error(`Asset has wrong hash: ${filename}`);
    }

    return result;
};

/**
 * @type {KnownAssetCollection}
 */
const knownAssets = Object.assign({},
    projects.reduce((bag, id) => {
        bag[id] = loadProject(id);
        return bag;
    }, /** @type {KnownAssetCollection} */ ({})),
    assets.reduce((bag, filename) => {
        bag[filename] = loadAsset(filename);
        return bag;
    }, /** @type {KnownAssetCollection} */ ({}))
);

module.exports = knownAssets;
