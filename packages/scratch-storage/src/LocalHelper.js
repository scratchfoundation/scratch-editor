const localforage = require('localforage');

const Asset = require('./Asset');
const Helper = require('./Helper');

/**
 * Implements storage on the local device, available even when the device has no network connection.
 */
class LocalHelper extends Helper {

    constructor (parent) {
        super(parent);

        localforage.config({
            name: 'Scratch 3.0',
            size: 100 * 1024 * 1024
        });
    }

    /**
     * Fetch an asset but don't process dependencies.
     * @param {AssetType} assetType - The type of asset to fetch.
     * @param {string} assetId - The ID of the asset to fetch: a project ID, MD5, etc.
     * @return {Promise.<Asset>} A promise for the contents of the asset.
     */
    load (assetType, assetId) {
        return new Promise((fulfill, reject) => {
            const fileName = [assetId, assetType.runtimeFormat].join('.');
            localforage.getItem(fileName).then(
                data => {
                    fulfill(new Asset(assetType, assetId, assetType.runtimeFormat, data));
                },
                error => {
                    reject(error);
                });
        });
    }
}

module.exports = LocalHelper;
