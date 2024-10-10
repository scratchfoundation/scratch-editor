import md5 from 'js-md5';

import log from './log';

import Asset from './Asset';
import AssetType from './AssetType';
import DataFormat from './DataFormat';
import Helper from './Helper';

import defaultImageBitmap from './builtins/defaultBitmap.png?arrayBuffer';
import defaultSound from './builtins/defaultSound.wav?arrayBuffer';
import defaultImageVector from './builtins/defaultVector.svg?arrayBuffer';

import {Buffer} from 'buffer/';

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
        data: Buffer.from(defaultImageBitmap)
    },
    {
        type: AssetType.Sound,
        format: DataFormat.WAV,
        id: null,
        data: Buffer.from(defaultSound)
    },
    {
        type: AssetType.ImageVector,
        format: DataFormat.SVG,
        id: null,
        data: Buffer.from(defaultImageVector)
    }
];

/**
 * @type {BuiltinAssetRecord[]}
 */
const BuiltinAssets = DefaultAssets.concat([
]);

export default class BuiltinHelper extends Helper {
    // TODO: Typing
    public assets: any;

    constructor (parent) {
        super(parent);

        /**
         * In-memory storage for all built-in assets.
         * @type {Object.<AssetType, AssetIdMap>} Maps asset type to a map of asset ID to actual assets.
         * @typedef {Object.<string, BuiltinAssetRecord>} AssetIdMap - Maps asset ID to asset.
         */
        this.assets = {};

        BuiltinAssets.forEach(assetRecord => {
            assetRecord.id = this._store(assetRecord.type, assetRecord.format, assetRecord.data, assetRecord.id);
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
        let asset: Asset | null = null;
        if (Object.prototype.hasOwnProperty.call(this.assets, assetId)) {
            /** @type{BuiltinAssetRecord} */
            const assetRecord = this.assets[assetId];
            asset = new Asset(assetRecord.type, assetRecord.id, assetRecord.format, assetRecord.data);
        }
        return asset;
    }

    /**
     * Alias for store (old name of store)
     * @deprecated Use BuiltinHelper.store
     * @param {AssetType} assetType - The type of the asset to cache.
     * @param {DataFormat} dataFormat - The dataFormat of the data for the cached asset.
     * @param {Buffer} data - The data for the cached asset.
     * @param {string} id - The id for the cached asset.
     * @returns {string} The calculated id of the cached asset, or the supplied id if the asset is mutable.
     */
    cache (assetType, dataFormat, data, id) {
        log.warn('Deprecation: BuiltinHelper.cache has been replaced with BuiltinHelper.store.');
        return this.store(assetType, dataFormat, data, id);
    }

    /**
     * Deprecated external API for _store
     * @deprecated Not for external use. Create assets and keep track of them outside of the storage instance.
     * @param {AssetType} assetType - The type of the asset to cache.
     * @param {DataFormat} dataFormat - The dataFormat of the data for the cached asset.
     * @param {Buffer} data - The data for the cached asset.
     * @param {(string|number)} id - The id for the cached asset.
     * @returns {string} The calculated id of the cached asset, or the supplied id if the asset is mutable.
     */
    store (assetType, dataFormat, data, id) {
        log.warn('Deprecation: use Storage.createAsset. BuiltinHelper is for internal use only.');
        return this._store(assetType, dataFormat, data, id);
    }

    /**
     * Cache an asset for future lookups by ID.
     * @param {AssetType} assetType - The type of the asset to cache.
     * @param {DataFormat} dataFormat - The dataFormat of the data for the cached asset.
     * @param {Buffer} data - The data for the cached asset.
     * @param {(string|number)} id - The id for the cached asset.
     * @returns {string} The calculated id of the cached asset, or the supplied id if the asset is mutable.
     */
    _store (assetType, dataFormat, data, id) {
        if (!dataFormat) throw new Error('Data cached without specifying its format');
        if (id !== '' && id !== null && typeof id !== 'undefined') {
            if (Object.prototype.hasOwnProperty.call(this.assets, id) && assetType.immutable) return id;
        } else if (assetType.immutable) {
            id = md5(data);
        } else {
            throw new Error('Tried to cache data without an id');
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
     * @return {?Promise.<Asset>} A promise for the contents of the asset.
     */
    load (assetType, assetId) {
        if (!this.get(assetId)) {
            // Return null immediately so Storage can quickly move to trying the
            // next helper.
            return null;
        }
        return Promise.resolve(this.get(assetId));
    }
}
