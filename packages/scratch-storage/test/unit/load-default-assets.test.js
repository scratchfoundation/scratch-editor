const md5 = require('js-md5');

const ScratchStorage = require('../../src/index.js');

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
