const log = require('./log');

const BuiltinHelper = require('./BuiltinHelper');
const WebHelper = require('./WebHelper');

const _Asset = require('./Asset');
const _AssetType = require('./AssetType');
const _DataFormat = require('./DataFormat');

class ScratchStorage {
    constructor () {
        this.defaultAssetId = {};

        this.builtinHelper = new BuiltinHelper(this);
        this.webHelper = new WebHelper(this);
        this.builtinHelper.registerDefaultAssets(this);

        this._helpers = [
            {
                helper: this.builtinHelper,
                priority: 100
            },
            {
                helper: this.webHelper,
                priority: -100
            }
        ];
    }

    /**
     * @return {Asset} - the `Asset` class constructor.
     * @constructor
     */
    get Asset () {
        return _Asset;
    }

    /**
     * @return {AssetType} - the list of supported asset types.
     * @constructor
     */
    get AssetType () {
        return _AssetType;
    }

    /**
     * @return {DataFormat} - the list of supported data formats.
     * @constructor
     */
    get DataFormat () {
        return _DataFormat;
    }

    /**
     * @deprecated Please use the `Asset` member of a storage instance instead.
     * @return {Asset} - the `Asset` class constructor.
     * @constructor
     */
    static get Asset () {
        return _Asset;
    }

    /**
     * @deprecated Please use the `AssetType` member of a storage instance instead.
     * @return {AssetType} - the list of supported asset types.
     * @constructor
     */
    static get AssetType () {
        return _AssetType;
    }

    /**
     * Add a storage helper to this manager. Helpers with a higher priority number will be checked first when loading
     * or storing assets. For comparison, the helper for built-in assets has `priority=100` and the default web helper
     * has `priority=-100`. The relative order of helpers with equal priorities is undefined.
     * @param {Helper} helper - the helper to be added.
     * @param {number} [priority] - the priority for this new helper (default: 0).
     */
    addHelper (helper, priority = 0) {
        this._helpers.push({helper, priority});
        this._helpers.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Synchronously fetch a cached asset from built-in storage. Assets are cached when they are loaded.
     * @param {string} assetId - The id of the asset to fetch.
     * @returns {?Asset} The asset, if it exists.
     */
    get (assetId) {
        return this.builtinHelper.get(assetId);
    }

    /**
     * Deprecated API for caching built-in assets. Use createAsset.
     * @param {AssetType} assetType - The type of the asset to cache.
     * @param {DataFormat} dataFormat - The dataFormat of the data for the cached asset.
     * @param {Buffer} data - The data for the cached asset.
     * @param {string} id - The id for the cached asset.
     * @returns {string} The calculated id of the cached asset, or the supplied id if the asset is mutable.
     */
    cache (assetType, dataFormat, data, id) {
        log.warn('Deprecation: Storage.cache is deprecated. Use Storage.createAsset, and store assets externally.');
        return this.builtinHelper._store(assetType, dataFormat, data, id);
    }

    /**
     * Construct an Asset, and optionally generate an md5 hash of its data to create an id
     * @param {AssetType} assetType - The type of the asset to cache.
     * @param {DataFormat} dataFormat - The dataFormat of the data for the cached asset.
     * @param {Buffer} data - The data for the cached asset.
     * @param {string} [id] - The id for the cached asset.
     * @param {bool} [generateId] - flag to set id to an md5 hash of data if `id` isn't supplied
     * @returns {Asset} generated Asset with `id` attribute set if not supplied
     */
    createAsset (assetType, dataFormat, data, id, generateId) {
        if (!dataFormat) throw new Error('Tried to create asset without a dataFormat');
        return new _Asset(assetType, id, dataFormat, data, generateId);
    }

    /**
     * Register a web-based source for assets. Sources will be checked in order of registration.
     * @param {Array.<AssetType>} types - The types of asset provided by this source.
     * @param {UrlFunction} getFunction - A function which computes a GET URL from an Asset.
     * @param {UrlFunction} createFunction - A function which computes a POST URL for asset data.
     * @param {UrlFunction} updateFunction - A function which computes a PUT URL for asset data.
     */
    addWebStore (types, getFunction, createFunction, updateFunction) {
        this.webHelper.addStore(types, getFunction, createFunction, updateFunction);
    }

    /**
     * Register a web-based source for assets. Sources will be checked in order of registration.
     * @deprecated Please use addWebStore
     * @param {Array.<AssetType>} types - The types of asset provided by this source.
     * @param {UrlFunction} urlFunction - A function which computes a GET URL from an Asset.
     */
    addWebSource (types, urlFunction) {
        log.warn('Deprecation: Storage.addWebSource has been replaced by addWebStore.');
        this.addWebStore(types, urlFunction);
    }

    /**
     * TODO: Should this be removed in favor of requesting an asset with `null` as the ID?
     * @param {AssetType} type - Get the default ID for assets of this type.
     * @return {?string} The ID of the default asset of the given type, if any.
     */
    getDefaultAssetId (type) {
        if (Object.prototype.hasOwnProperty.call(this.defaultAssetId, type.name)) {
            return this.defaultAssetId[type.name];
        }
    }

    /**
     * Set the default ID for a particular type of asset. This default asset will be used if a requested asset cannot
     * be found and automatic fallback is enabled. Ideally this should be an asset that is available locally or even
     * one built into this module.
     * TODO: Should this be removed in favor of requesting an asset with `null` as the ID?
     * @param {AssetType} type - The type of asset for which the default will be set.
     * @param {string} id - The default ID to use for this type of asset.
     */
    setDefaultAssetId (type, id) {
        this.defaultAssetId[type.name] = id;
    }

    /**
     * Fetch an asset by type & ID.
     * @param {AssetType} assetType - The type of asset to fetch. This also determines which asset store to use.
     * @param {string} assetId - The ID of the asset to fetch: a project ID, MD5, etc.
     * @param {DataFormat} [dataFormat] - Optional: load this format instead of the AssetType's default.
     * @return {Promise.<Asset>} A promise for the requested Asset.
     *   If the promise is resolved with non-null, the value is the requested asset or a fallback.
     *   If the promise is resolved with null, the desired asset could not be found with the current asset sources.
     *   If the promise is rejected, there was an error on at least one asset source. HTTP 404 does not count as an
     *   error here, but (for example) HTTP 403 does.
     */
    load (assetType, assetId, dataFormat) {
        /** @type {Helper[]} */
        const helpers = this._helpers.map(x => x.helper);
        const errors = [];
        dataFormat = dataFormat || assetType.runtimeFormat;

        let helperIndex = 0;
        let helper;
        const tryNextHelper = err => {
            if (err) {
                errors.push(err);
            }

            helper = helpers[helperIndex++];

            if (helper) {
                const loading = helper.load(assetType, assetId, dataFormat);
                if (loading === null) {
                    return tryNextHelper();
                }
                // Note that other attempts may have logged errors; if this succeeds they will be suppressed.
                return loading
                    // TODO: maybe some types of error should prevent trying the next helper?
                    .catch(tryNextHelper);
            } else if (errors.length > 0) {
                // At least one thing went wrong and also we couldn't find the
                // asset.
                return Promise.reject(errors);
            }

            // Nothing went wrong but we couldn't find the asset.
            return Promise.resolve(null);
        };

        return tryNextHelper();
    }

    /**
     * Store an asset by type & ID.
     * @param {AssetType} assetType - The type of asset to fetch. This also determines which asset store to use.
     * @param {?DataFormat} [dataFormat] - Optional: load this format instead of the AssetType's default.
     * @param {Buffer} data - Data to store for the asset
     * @param {?string} [assetId] - The ID of the asset to fetch: a project ID, MD5, etc.
     * @return {Promise.<object>} A promise for asset metadata
     */
    store (assetType, dataFormat, data, assetId) {
        dataFormat = dataFormat || assetType.runtimeFormat;
        return new Promise(
            (resolve, reject) =>
                this.webHelper.store(assetType, dataFormat, data, assetId)
                    .then(body => {
                        this.builtinHelper._store(assetType, dataFormat, data, body.id);
                        return resolve(body);
                    })
                    .catch(error => reject(error))
        );
    }
}

module.exports = ScratchStorage;
