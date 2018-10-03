// Use JS implemented TextDecoder and TextEncoder if it is not provided by the
// browser.
let _TextDecoder;
let _TextEncoder;
const encoding = require('text-encoding');
if (typeof TextDecoder === 'undefined' || typeof TextEncoder === 'undefined') {
    _TextDecoder = encoding.TextDecoder;
    _TextEncoder = encoding.TextEncoder;
} else {
    /* global TextDecoder TextEncoder */
    _TextDecoder = TextDecoder;
    _TextEncoder = TextEncoder;
}

const base64js = require('base64-js');

const memoizedToString = (function () {
    const strings = {};
    return (assetId, data) => {
        if (!strings.hasOwnProperty(assetId)) {
            strings[assetId] = base64js.fromByteArray(data);
        }
        return strings[assetId];
    };
}());

class Asset {
    /**
     * Construct an Asset.
     * @param {AssetType} assetType - The type of this asset (sound, image, etc.)
     * @param {string} assetId - The ID of this asset.
     * @param {DataFormat} [dataFormat] - The format of the data (WAV, PNG, etc.); required iff `data` is present.
     * @param {Buffer} [data] - The in-memory data for this asset; optional.
     */
    constructor (assetType, assetId, dataFormat, data) {
        /** @type {AssetType} */
        this.assetType = assetType;

        /** @type {string} */
        this.assetId = assetId;

        this.setData(data, dataFormat || assetType.runtimeFormat);

        /** @type {Asset[]} */
        this.dependencies = [];
    }

    setData (data, dataFormat) {
        if (data && !dataFormat) {
            throw new Error('Data provided without specifying its format');
        }

        /** @type {DataFormat} */
        this.dataFormat = dataFormat;

        /** @type {Buffer} */
        this.data = data;
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
     */
    encodeTextData (data, dataFormat) {
        const encoder = new _TextEncoder();
        this.setData(encoder.encode(data), dataFormat);
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

module.exports = Asset;
