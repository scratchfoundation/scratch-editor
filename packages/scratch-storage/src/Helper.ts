import Asset from "./Asset";
import {ScratchStorage} from "./ScratchStorage";

/**
 * Base class for asset load/save helpers.
 * @abstract
 */
export default class Helper {
    public parent!: ScratchStorage;

    constructor (parent) {
        this.parent = parent;
    }

    /**
     * Fetch an asset but don't process dependencies.
     * @param {AssetType} assetType - The type of asset to fetch.
     * @param {string} assetId - The ID of the asset to fetch: a project ID, MD5, etc.
     * @param {DataFormat} dataFormat - The file format / file extension of the asset to fetch: PNG, JPG, etc.
     * @return {Promise.<Asset>} A promise for the contents of the asset.
     */
    load (assetType, assetId, dataFormat): null | Asset | Promise<Asset | null> {
        return Promise.reject(new Error(`No asset of type ${assetType} for ID ${assetId} with format ${dataFormat}`));
    }
}
