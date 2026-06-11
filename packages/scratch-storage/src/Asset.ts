import md5 from 'js-md5';
import {memoizedToString, _TextEncoder, _TextDecoder} from './memoizedToString';
import {AssetType} from './AssetType';
import {DataFormat} from './DataFormat';

// TODO: The comments in this file indicate that the asset id is a string only, but
// the types in BuiltinHelper and the default project builder in scratch-gui
// allow for it to be a number as well.
export type AssetId = string | number;

// Projects are strings, other assets are byte arrays
export type AssetData = string | Uint8Array;

export default class Asset {
    public assetType: AssetType;
    public assetId?: AssetId;
    public data?: AssetData;
    public dataFormat?: DataFormat;
    public dependencies: Asset[];
    public clean?: boolean;

    /**
     * Construct an Asset.
     * @param {AssetType} assetType - The type of this asset (sound, image, etc.)
     * @param {string} assetId - The ID of this asset.
     * @param {DataFormat} [dataFormat] - The format of the data (WAV, PNG, etc.); required iff `data` is present.
     * @param {Buffer} [data] - The in-memory data for this asset; optional.
     * @param {boolean} [generateId] - Whether to create id from an md5 hash of data
     */
    constructor (
        assetType: AssetType,
        assetId?: AssetId,
        dataFormat?: DataFormat,
        data?: AssetData,
        generateId?: boolean
    ) {
        /** @type {AssetType} */
        this.assetType = assetType;

        /** @type {string} */
        this.assetId = assetId;

        this.setData(data, dataFormat || assetType.runtimeFormat, generateId);

        /** @type {Asset[]} */
        this.dependencies = [];
    }

    setData (data: AssetData | undefined, dataFormat: DataFormat | undefined, generateId?: boolean) {
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
    decodeText (): string {
        const decoder = new _TextDecoder();

        // The data may be string, but it seems like this function is only called if the data is a byte array?
        // This was the behavior of the code when we added TS
        return decoder.decode(this.data as Uint8Array);
    }

    /**
     * Same as `setData` but encodes text first.
     * @param {string} data - the text data to encode and store.
     * @param {DataFormat} dataFormat - the format of the data (DataFormat.SVG for example).
     * @param {boolean} generateId - after setting data, set the id to an md5 of the data?
     */
    encodeTextData (data: string, dataFormat: DataFormat, generateId: boolean): void {
        const encoder = new _TextEncoder();
        this.setData(encoder.encode(data), dataFormat, generateId);
    }

    /**
     * @param {string} [contentType] - Optionally override the content type to be included in the data URI.
     * @returns {string} - A data URI representing the asset's data.
     */
    encodeDataURI (contentType: string): string {
        contentType = contentType || this.assetType.contentType;

        // The data may be string, but it seems like this function is only called if the data is a byte array?
        // This was the behavior of the code when we added TS
        return `data:${contentType};base64,${memoizedToString(this.assetId!, this.data as Uint8Array)}`;
    }
}
