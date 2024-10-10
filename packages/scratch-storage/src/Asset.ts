import md5 from 'js-md5';
import {memoizedToString, _TextEncoder, _TextDecoder} from './memoizedToString';

export default class Asset {
    // TODO: Typing
    public assetType: any;
    public assetId: any;
    public data: any;
    public dataFormat: any;
    public dependencies: any;
    public clean?: boolean;

    /**
     * Construct an Asset.
     * @param {AssetType} assetType - The type of this asset (sound, image, etc.)
     * @param {string} assetId - The ID of this asset.
     * @param {DataFormat} [dataFormat] - The format of the data (WAV, PNG, etc.); required iff `data` is present.
     * @param {Buffer} [data] - The in-memory data for this asset; optional.
     * @param {bool} [generateId] - Whether to create id from an md5 hash of data
     */
    constructor (assetType, assetId, dataFormat, data?, generateId?) {
        /** @type {AssetType} */
        this.assetType = assetType;

        /** @type {string} */
        this.assetId = assetId;

        this.setData(data, dataFormat || assetType.runtimeFormat, generateId);

        /** @type {Asset[]} */
        this.dependencies = [];
    }

    setData (data, dataFormat, generateId?) {
        if (data && !dataFormat) {
            throw new Error('Data provided without specifying its format');
        }

        /** @type {DataFormat} */
        this.dataFormat = dataFormat;

        /** @type {Buffer} */
        this.data = data;

        if (generateId) this.assetId = md5(data);

        // Mark as clean only if set is being called without generateId
        // If a new id is being generated, mark this asset as not clean
        this.clean = !generateId;
    }

    /**
     * @returns {string} - This asset's data, decoded as text.
     */
    decodeText () {
        const decoder = new _TextDecoder();
        return decoder.decode(this.data);
    }

    /**
     * Same as `setData` but encodes text first.
     * @param {string} data - the text data to encode and store.
     * @param {DataFormat} dataFormat - the format of the data (DataFormat.SVG for example).
     * @param {bool} generateId - after setting data, set the id to an md5 of the data?
     */
    encodeTextData (data, dataFormat, generateId) {
        const encoder = new _TextEncoder();
        this.setData(encoder.encode(data), dataFormat, generateId);
    }

    /**
     * @param {string} [contentType] - Optionally override the content type to be included in the data URI.
     * @returns {string} - A data URI representing the asset's data.
     */
    encodeDataURI (contentType) {
        contentType = contentType || this.assetType.contentType;
        return `data:${contentType};base64,${memoizedToString(this.assetId, this.data)}`;
    }
}
