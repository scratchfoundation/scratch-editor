class Asset {
    /**
     * Construct an Asset.
     * @param {AssetType} assetType - The type of this asset (sound, image, etc.)
     * @param {string} assetId - The ID of this asset.
     * @param {DataFormat} [dataFormat] - The format of the data (WAV, PNG, etc.); required iff `data` is present.
     * @param {Uint8Array} [data] - The in-memory data for this asset; optional.
     */
    constructor (assetType, assetId, dataFormat, data) {
        /** @type {AssetType} */
        this.assetType = assetType;

        /** @type {string} */
        this.assetId = assetId;
        if (data && !dataFormat) {
            throw new Error('Data provided without specifying its format');
        }

        /** @type {DataFormat} */
        this.dataFormat = dataFormat;

        /** @type {Uint8Array} */
        this.data = data;

        /** @type {Asset[]} */
        this.dependencies = [];
    }
}

module.exports = Asset;
