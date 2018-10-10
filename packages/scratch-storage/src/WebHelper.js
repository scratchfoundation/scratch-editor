const nets = require('nets');

const log = require('./log');

const Asset = require('./Asset');
const Helper = require('./Helper');

/**
 * @typedef {function} UrlFunction - A function which computes a URL from asset information.
 * @param {Asset} - The asset for which the URL should be computed.
 * @returns {(string|object)} - A string representing the URL for the asset request OR an object with configuration for
 *                              the underlying `nets` call (necessary for configuring e.g. authentication)
 */

class WebHelper extends Helper {
    constructor (parent) {
        super(parent);

        /**
         * @type {Array.<StoreRecord>}
         * @typedef {object} StoreRecord
         * @property {Array.<string>} types - The types of asset provided by this store, from AssetType's name field.
         * @property {UrlFunction} getFunction - A function which computes a URL from an Asset.
         * @property {UrlFunction} createFunction - A function which computes a URL from an Asset.
         * @property {UrlFunction} updateFunction - A function which computes a URL from an Asset.
         */
        this.stores = [];
    }

    /**
     * Register a web-based source for assets. Sources will be checked in order of registration.
     * @deprecated Please use addStore
     * @param {Array.<AssetType>} types - The types of asset provided by this source.
     * @param {UrlFunction} urlFunction - A function which computes a URL from an Asset.
     */
    addSource (types, urlFunction) {
        log.warn('Deprecation: WebHelper.addSource has been replaced with WebHelper.addStore.');
        this.addStore(types, urlFunction);
    }

    /**
     * Register a web-based store for assets. Sources will be checked in order of registration.
     * @param {Array.<AssetType>} types - The types of asset provided by this store.
     * @param {UrlFunction} getFunction - A function which computes a GET URL for an Asset
     * @param {UrlFunction} createFunction - A function which computes a POST URL for an Asset
     * @param {UrlFunction} updateFunction - A function which computes a PUT URL for an Asset
     */
    addStore (types, getFunction, createFunction, updateFunction) {
        this.stores.push({
            types: types.map(assetType => assetType.name),
            get: getFunction,
            create: createFunction,
            update: updateFunction
        });
    }

    /**
     * Fetch an asset but don't process dependencies.
     * @param {AssetType} assetType - The type of asset to fetch.
     * @param {string} assetId - The ID of the asset to fetch: a project ID, MD5, etc.
     * @param {DataFormat} dataFormat - The file format / file extension of the asset to fetch: PNG, JPG, etc.
     * @return {Promise.<Asset>} A promise for the contents of the asset.
     */
    load (assetType, assetId, dataFormat) {

        /** @type {Array.<{url:string, result:*}>} List of URLs attempted & errors encountered. */
        const errors = [];
        const stores = this.stores.slice();
        const asset = new Asset(assetType, assetId, dataFormat);
        let storeIndex = 0;

        return new Promise((resolve, reject) => {

            const tryNextSource = () => {

                /** @type {UrlFunction} */
                let reqConfigFunction;

                while (storeIndex < stores.length) {
                    const store = stores[storeIndex];
                    ++storeIndex;
                    if (store.types.indexOf(assetType.name) >= 0) {
                        reqConfigFunction = store.get;
                        break;
                    }
                }

                if (reqConfigFunction) {
                    let reqConfig = reqConfigFunction(asset);
                    if (reqConfig === false) {
                        tryNextSource();
                        return;
                    }
                    if (typeof reqConfig === 'string') {
                        reqConfig = {
                            url: reqConfig
                        };
                    }

                    nets(Object.assign({
                        method: 'get'
                    }, reqConfig), (err, resp, body) => {
                        // body is a Buffer
                        if (err || Math.floor(resp.statusCode / 100) !== 2) {
                            tryNextSource();
                        } else {
                            asset.setData(body, dataFormat);
                            resolve(asset);
                        }
                    });
                } else if (errors.length > 0) {
                    reject(errors);
                } else {
                    resolve(null); // no stores matching asset
                }
            };

            tryNextSource();
        });
    }

    /**
     * Create or update an asset with provided data. The create function is called if no asset id is provided
     * @param {AssetType} assetType - The type of asset to create or update.
     * @param {?DataFormat} dataFormat - DataFormat of the data for the stored asset.
     * @param {Buffer} data - The data for the cached asset.
     * @param {?string} assetId - The ID of the asset to fetch: a project ID, MD5, etc.
     * @return {Promise.<object>} A promise for the response from the create or update request
     */
    store (assetType, dataFormat, data, assetId) {
        const asset = new Asset(assetType, assetId, dataFormat);
        // If we have an asset id, we should update, otherwise create to get an id
        const create = assetId === '' || assetId === null || typeof assetId === 'undefined';

        // Use the first store with the appropriate asset type and url function
        const store = this.stores.filter(s =>
            // Only use stores for the incoming asset type
            s.types.indexOf(assetType.name) !== -1 && (
                // Only use stores that have a create function if this is a create request
                // or an update function if this is an update request
                (create && s.create) || s.update
            )
        )[0];

        const method = create ? 'post' : 'put';

        return new Promise((resolve, reject) => {
            if (!store) return reject('No appropriate stores');

            let reqConfig = create ? store.create(asset) : store.update(asset);
            if (typeof reqConfig === 'string') {
                reqConfig = {
                    url: reqConfig
                };
            }
            return nets(Object.assign({
                body: data,
                method: method,
                encoding: undefined // eslint-disable-line no-undefined
            }, reqConfig), (err, resp, body) => {
                if (err || Math.floor(resp.statusCode / 100) !== 2) {
                    return reject(err || resp.statusCode);
                }
                // xhr makes it difficult to both send FormData and automatically
                // parse a JSON response. So try to parse everything as JSON.
                if (typeof body === 'string') {
                    try {
                        body = JSON.parse(body);
                    } catch (parseError) {
                        // If it's not parseable, then we can't add the id even
                        // if we want to, so stop here
                        return resolve(body);
                    }
                }
                return resolve(Object.assign({
                    id: body['content-name'] || assetId
                }, body));
            });
        });
    }
}

module.exports = WebHelper;
