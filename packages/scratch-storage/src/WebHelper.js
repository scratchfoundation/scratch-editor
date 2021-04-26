const log = require('./log');

const Asset = require('./Asset');
const Helper = require('./Helper');
const ProxyTool = require('./ProxyTool');

const ensureRequestConfig = reqConfig => {
    if (typeof reqConfig === 'string') {
        return {
            url: reqConfig
        };
    }
    return reqConfig;
};

/**
 * @typedef {function} UrlFunction - A function which computes a URL from asset information.
 * @param {Asset} - The asset for which the URL should be computed.
 * @returns {(string|object)} - A string representing the URL for the asset request OR an object with configuration for
 *                              the underlying fetch call (necessary for configuring e.g. authentication)
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

        /**
         * Set of tools to best load many assets in parallel. If one tool
         * cannot be used, it will use the next.
         * @type {ProxyTool}
         */
        this.assetTool = new ProxyTool();

        /**
         * Set of tools to best load project data in parallel with assets. This
         * tool set prefers tools that are immediately ready. Some tools have
         * to initialize before they can load files.
         * @type {ProxyTool}
         */
        this.projectTool = new ProxyTool(ProxyTool.TOOL_FILTER.READY);
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
        const stores = this.stores.slice()
            .filter(store => store.types.indexOf(assetType.name) >= 0);
        const asset = new Asset(assetType, assetId, dataFormat);

        let tool = this.assetTool;
        if (assetType.name === 'Project') {
            tool = this.projectTool;
        }

        let storeIndex = 0;
        const tryNextSource = () => {
            const store = stores[storeIndex++];

            /** @type {UrlFunction} */
            const reqConfigFunction = store.get;

            if (reqConfigFunction) {
                const reqConfig = ensureRequestConfig(reqConfigFunction(asset));
                if (reqConfig === false) {
                    return tryNextSource();
                }

                return tool.get(reqConfig)
                    .then(body => asset.setData(body, dataFormat))
                    .catch(tryNextSource);
            } else if (errors.length > 0) {
                return Promise.reject(errors);
            }

            // no stores matching asset
            return Promise.resolve(null);
        };

        return tryNextSource().then(() => asset);
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

        if (!store) return Promise.reject(new Error('No appropriate stores'));

        let tool = this.assetTool;
        if (assetType.name === 'Project') {
            tool = this.projectTool;
        }

        const reqConfig = ensureRequestConfig(
            create ? store.create(asset) : store.update(asset)
        );
        const reqBodyConfig = Object.assign({body: data, method}, reqConfig);
        return tool.send(reqBodyConfig)
            .then(body => {
                // xhr makes it difficult to both send FormData and
                // automatically parse a JSON response. So try to parse
                // everything as JSON.
                if (typeof body === 'string') {
                    try {
                        body = JSON.parse(body);
                    } catch (parseError) {
                        // If it's not parseable, then we can't add the id even
                        // if we want to, so stop here
                        return body;
                    }
                }
                return Object.assign({
                    id: body['content-name'] || assetId
                }, body);
            });
    }
}

module.exports = WebHelper;
