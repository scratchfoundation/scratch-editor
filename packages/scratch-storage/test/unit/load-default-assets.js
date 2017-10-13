const md5 = require('js-md5');
const test = require('tap').test;

const ScratchStorage = require('../../dist/node/scratch-storage');

var storage;
test('constructor', t => {
    storage = new ScratchStorage();
    t.type(storage, ScratchStorage);
    t.end();
});

const defaultAssetTypes = [storage.AssetType.ImageBitmap, storage.AssetType.ImageVector, storage.AssetType.Sound];
const defaultIds = {};

test('getDefaultAssetId', t => {
    for (var i = 0; i < defaultAssetTypes.length; ++i) {
        const assetType = defaultAssetTypes[i];
        const id = storage.getDefaultAssetId(assetType);
        t.type(id, 'string');
        defaultIds[assetType.name] = id;
    }
    t.end();
});

test('load', t => {
    const promises = [];
    const checkAsset = (assetType, id, asset) => {
        t.type(asset, storage.Asset);
        t.strictEqual(asset.assetId, id);
        t.strictEqual(asset.assetType, assetType);
        t.ok(asset.data.length);
        t.strictEqual(md5(asset.data), id);
    };
    for (var i = 0; i < defaultAssetTypes.length; ++i) {
        const assetType = defaultAssetTypes[i];
        const id = defaultIds[assetType.name];

        const promise = storage.load(assetType, id);
        t.type(promise, 'Promise');

        promises.push(promise);

        promise.then(asset => checkAsset(assetType, id, asset));
    }

    return Promise.all(promises);
});
