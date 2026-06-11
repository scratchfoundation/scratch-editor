const md5 = require('js-md5');

const {ScratchStorage} = require('../../src/ScratchStorage');

// Hash and file size of each default asset
const knownSizes = {
    '8e768a5a5a01891b05c01c9ca15eb6aa': 255,
    'b586745b98e94d7574f7f7b48d831e20': 46,
    'e5cb3b2aa4e1a9b4c735c3415e507e66': 925
};

const getDefaultAssetTypes = storage => {
    const defaultAssetTypes = [storage.AssetType.ImageBitmap, storage.AssetType.ImageVector, storage.AssetType.Sound];
    return defaultAssetTypes;
};

const getDefaultAssetIds = (storage, defaultAssetTypes) => {
    const defaultIds = {};
    for (const assetType of defaultAssetTypes) {
        const id = storage.getDefaultAssetId(assetType);
        defaultIds[assetType.name] = id;
    }
    return defaultIds;
};

test('constructor', () => {
    const storage = new ScratchStorage();
    expect(storage).toBeInstanceOf(ScratchStorage);
});

test('getDefaultAssetId', () => {
    const storage = new ScratchStorage();
    const defaultAssetTypes = getDefaultAssetTypes(storage);
    const defaultIds = getDefaultAssetIds(storage, defaultAssetTypes);
    for (const assetType of defaultAssetTypes) {
        const id = defaultIds[assetType.name];
        expect(typeof id).toBe('string');
    }
});

test('load', () => {
    const storage = new ScratchStorage();
    const defaultAssetTypes = getDefaultAssetTypes(storage);
    const defaultIds = getDefaultAssetIds(storage, defaultAssetTypes);

    const promises = [];
    const checkAsset = (assetType, id, asset) => {
        expect(asset).toBeInstanceOf(storage.Asset);
        expect(asset.assetId).toStrictEqual(id);
        expect(asset.assetType).toStrictEqual(assetType);
        expect(asset.data.length).toBeTruthy();
        expect(asset.data.length).toBe(knownSizes[id]);
        expect(md5(asset.data)).toBe(id);
    };
    for (const assetType of defaultAssetTypes) {
        const id = defaultIds[assetType.name];

        const promise = storage.load(assetType, id);
        expect(promise).toBeInstanceOf(Promise);

        const checkedPromise = promise.then(asset => checkAsset(assetType, id, asset));

        promises.push(checkedPromise);
    }

    return Promise.all(promises);
});
