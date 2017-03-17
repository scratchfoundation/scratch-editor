const got = require('got');

const Asset = require('./Asset');
const Helper = require('./Helper');

/**
 * @typedef {function} UrlFunction - A function which computes a URL from asset information.
 * @param {Asset} - The asset for which the URL should be computed.
 * @returns {string} - The URL for the asset.
 */

class WebHelper extends Helper {
    constructor (parent) {
        super(parent);

        /**
         * @type {Array.<SourceRecord>}
         * @typedef {object} SourceRecord
         * @property {Array.<string>} types - The types of asset provided by this source, from AssetType's name field.
         * @property {UrlFunction} urlFunction - A function which computes a URL from an Asset.
         */
        this.sources = [];
    }

    /**
     * Register a web-based source for assets. Sources will be checked in order of registration.
     * @param {Array.<AssetType>} types - The types of asset provided by this source.
     * @param {UrlFunction} urlFunction - A function which computes a URL from an Asset.
     */
    addSource (types, urlFunction) {
        this.sources.push({
            types: types.map(assetType => assetType.name),
            urlFunction: urlFunction
        });
    }

    /**
     * Fetch an asset but don't process dependencies.
     * @param {AssetType} assetType - The type of asset to fetch.
     * @param {string} assetId - The ID of the asset to fetch: a project ID, MD5, etc.
     * @return {Promise.<Asset>} A promise for the contents of the asset.
     */
    load (assetType, assetId) {

        /** @type {Array.<{url:string, result:*}>} List of URLs attempted & errors encountered. */
        const errors = [];
        const sources = this.sources.slice();
        const asset = new Asset(assetType, assetId);
        let sourceIndex = 0;

        return new Promise((fulfill, reject) => {

            const tryNextSource = () => {

                /** @type {UrlFunction} */
                let urlFunction;

                while (sourceIndex < sources.length) {
                    const source = sources[sourceIndex];
                    ++sourceIndex;
                    if (source.types.indexOf(assetType.name) >= 0) {
                        urlFunction = source.urlFunction;
                        break;
                    }
                }

                if (urlFunction) {
                    const options = {
                        encoding: null // return body as Buffer
                    };
                    const url = urlFunction(asset);
                    got(url, options).then(
                        response => {
                            if (response.status < 200 || response.status >= 300) {
                                if (response.status !== 404) {
                                    errors.push({url: url, result: response});
                                }
                                tryNextSource();
                            } else {
                                asset.data = response.body;
                                fulfill(asset);
                            }
                        },
                        error => {
                            errors.push({url: url, result: error});
                            tryNextSource();
                        });
                } else if (errors.length > 0) {
                    reject(errors);
                } else {
                    fulfill(null); // no sources matching asset
                }
            };

            tryNextSource();
        });
    }
}

module.exports = WebHelper;
