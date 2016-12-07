const crypto = require('crypto');

const Asset = require('./Asset');
const AssetType = require('./AssetType');
const DataFormat = require('./DataFormat');
const Helper = require('./Helper');

/**
 * @typedef {object} BuiltinAssetRecord
 * @property {AssetType} type - The type of the asset.
 * @property {DataFormat} format - The format of the asset's data.
 * @property {string} id - The asset's unique ID.
 * @property {string} data - The asset's data in string form.
 */

/**
 * @type {BuiltinAssetRecord[]}
 */
const DefaultAssets = [
    {
        type: AssetType.ImageBitmap,
        format: DataFormat.PNG,
        id: null,
        data: require('arraybuffer!./builtins/defaultBitmap.png') // eslint-disable-line global-require
    },
    {
        type: AssetType.Sound,
        format: DataFormat.WAV,
        id: null,
        data: require('arraybuffer!./builtins/defaultSound.wav') // eslint-disable-line global-require
    },
    {
        type: AssetType.ImageVector,
        format: DataFormat.SVG,
        id: null,
        data: require('arraybuffer!./builtins/defaultVector.svg') // eslint-disable-line global-require
    }
];

/**
 * @type {BuiltinAssetRecord[]}
 */
const BuiltinAssets = DefaultAssets.concat([
]);

class BuiltinHelper extends Helper {
    constructor (parent) {
        super(parent);

        /**
         * In-memory storage for all built-in assets.
         * @type {Object.<AssetType, AssetIdMap>} Maps asset type to a map of asset ID to actual assets.
         * @typedef {Object.<string, BuiltinAssetRecord>} AssetIdMap - Maps asset ID to asset.
         */
        this.assets = {};

        const numAssets = BuiltinAssets.length;
        for (let assetIndex = 0; assetIndex < numAssets; ++assetIndex) {
            const assetRecord = BuiltinAssets[assetIndex];
            const typeName = assetRecord.type.name;

            /** @type {AssetIdMap} */
            const typeBucket = this.assets[typeName] = this.assets[typeName] || {};

            if (!assetRecord.id) {
                const hash = crypto.createHash('md5');
                hash.update(assetRecord.data);
                assetRecord.id = hash.digest('hex');
            }

            typeBucket[assetRecord.id] = assetRecord;
        }
    }

    /**
     * Call `setDefaultAssetId` on the parent `ScratchStorage` instance to register all built-in default assets.
     */
    registerDefaultAssets () {
        const numAssets = DefaultAssets.length;
        for (let assetIndex = 0; assetIndex < numAssets; ++assetIndex) {
            const assetRecord = DefaultAssets[assetIndex];
            this.parent.setDefaultAssetId(assetRecord.type, assetRecord.id);
        }
    }

    /**
     * Fetch an asset but don't process dependencies.
     * @param {AssetType} assetType - The type of asset to fetch.
     * @param {string} assetId - The ID of the asset to fetch: a project ID, MD5, etc.
     * @return {Promise.<Asset>} A promise for the contents of the asset.
     */
    load (assetType, assetId) {
        if (this.assets.hasOwnProperty(assetType.name)) {
            const typeBucket = this.assets[assetType.name];
            if (typeBucket.hasOwnProperty(assetId)) {
                /** @type{BuiltinAssetRecord} */
                const assetRecord = typeBucket[assetId];
                const asset =
                    new Asset(assetRecord.type, assetRecord.id, assetRecord.format, new Uint8Array(assetRecord.data));
                return Promise.resolve(asset);
            }
        }
        return Promise.reject(new Error(`No builtin asset of type ${assetType} for ID ${assetId}`));
    }
}

module.exports = BuiltinHelper;
