const md5 = require('js-md5');

const Asset = require('./Asset');
const AssetType = require('./AssetType');
const DataFormat = require('./DataFormat');
const Helper = require('./Helper');

/**
 * @typedef {object} BuiltinAssetRecord
 * @property {AssetType} type - The type of the asset.
 * @property {DataFormat} format - The format of the asset's data.
 * @property {?string} id - The asset's unique ID.
 * @property {Buffer} data - The asset's data.
 */

/**
 * @type {BuiltinAssetRecord[]}
 */
const DefaultAssets = [
    {
        type: AssetType.ImageBitmap,
        format: DataFormat.PNG,
        id: null,
        data: new Buffer(
            require('arraybuffer-loader!./builtins/defaultBitmap.png') // eslint-disable-line global-require
        )
    },
    {
        type: AssetType.Sound,
        format: DataFormat.WAV,
        id: null,
        data: new Buffer(
            require('arraybuffer-loader!./builtins/defaultSound.wav') // eslint-disable-line global-require
        )
    },
    {
        type: AssetType.ImageVector,
        format: DataFormat.SVG,
        id: null,
        data: new Buffer(
            require('arraybuffer-loader!./builtins/defaultVector.svg') // eslint-disable-line global-require
        )
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

        BuiltinAssets.forEach(assetRecord => {
            assetRecord.id = this.cache(assetRecord.type, assetRecord.format, assetRecord.data, assetRecord.id);
        });
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
     * Synchronously fetch a cached asset for a given asset id. Returns null if not found.
     * @param {string} assetId - The id for the asset to fetch.
     * @returns {?Asset} The asset for assetId, if it exists.
     */
    get (assetId) {
        let asset = null;
        if (this.assets.hasOwnProperty(assetId)) {
            /** @type{BuiltinAssetRecord} */
            const assetRecord = this.assets[assetId];
            asset = new Asset(assetRecord.type, assetRecord.id, assetRecord.format, assetRecord.data);
        }
        return asset;
    }

    /**
     * Cache an asset for future lookups by ID.
     * @param {AssetType} assetType - The type of the asset to cache.
     * @param {DataFormat} dataFormat - The dataFormat of the data for the cached asset.
     * @param {Buffer} data - The data for the cached asset.
     * @param {string} id - The id for the cached asset.
     * @returns {string} The calculated id of the cached asset, or the supplied id if the asset is mutable.
     */
    cache (assetType, dataFormat, data, id) {
        if (!dataFormat) throw new Error('Data cached without specifying its format');
        if (id) {
            if (this.assets.hasOwnProperty(id) && assetType.immutable) return id;
        } else if (assetType.immutable) {
            id = md5(data);
        }
        this.assets[id] = {
            type: assetType,
            format: dataFormat,
            id: id,
            data: data
        };
        return id;
    }

    /**
     * Fetch an asset but don't process dependencies.
     * @param {AssetType} assetType - The type of asset to fetch.
     * @param {string} assetId - The ID of the asset to fetch: a project ID, MD5, etc.
     * @return {Promise.<Asset>} A promise for the contents of the asset.
     */
    load (assetType, assetId) {
        return Promise.resolve(this.get(assetId));
    }
}

module.exports = BuiltinHelper;
