const crypto = require('crypto');
const test = require('tap').test;

const ScratchStorage = require('../../dist/node/scratch-storage');

var storage;
test('constructor', t => {
    storage = new ScratchStorage();
    t.type(storage, ScratchStorage);
    t.end();
});

/**
 *
 * @type {AssetTestInfo[]}
 * @typedef {object} AssetTestInfo
 * @property {AssetType} type - The type of the asset.
 * @property {string} id - The asset's unique ID.
 */
const testAssets = [
    {
        type: storage.AssetType.Project,
        id: '117504922',
        md5: null // don't check MD5 for project without revision ID
    },
    {
        type: storage.AssetType.Project,
        id: '117504922.d6ae1ffb76f2bc83421cd3f40fc4fd57',
        md5: '1225460702e149727de28bff4cfd9e23'
    },
    {
        type: storage.AssetType.ImageVector,
        id: 'f88bf1935daea28f8ca098462a31dbb0', // cat1-a
        md5: 'f88bf1935daea28f8ca098462a31dbb0'
    },
    {
        type: storage.AssetType.ImageBitmap,
        id: '7e24c99c1b853e52f8e7f9004416fa34', // squirrel
        md5: '7e24c99c1b853e52f8e7f9004416fa34'
    },
    {
        type: storage.AssetType.Sound,
        id: '83c36d806dc92327b9e7049a565c6bff', // meow
        md5: '83c36d806dc92327b9e7049a565c6bff' // wat
    }
];

test('addWebSource', t => {
    t.doesNotThrow(() => {
        storage.addWebSource(
            [storage.AssetType.Project],
            asset => {
                const idParts = asset.assetId.split('.');
                return idParts[1] ?
                    `https://cdn.projects.scratch.mit.edu/internalapi/project/${idParts[0]}/get/${idParts[1]}` :
                    `https://cdn.projects.scratch.mit.edu/internalapi/project/${idParts[0]}/get/`;
            });
    });
    t.doesNotThrow(() => {
        storage.addWebSource(
            [storage.AssetType.ImageVector, storage.AssetType.ImageBitmap, storage.AssetType.Sound],
            asset => `https://cdn.assets.scratch.mit.edu/internalapi/asset/${asset.assetId}.${asset.assetType.runtimeFormat}/get/`
        );
    });
    t.end();
});

test('load', t => {
    const promises = [];
    const checkAsset = (assetInfo, asset) => {
        t.type(asset, storage.Asset);
        t.strictEqual(asset.assetId, assetInfo.id);
        t.strictEqual(asset.assetType, assetInfo.type);
        t.ok(asset.data.length);

        if (assetInfo.md5) {
            const hash = crypto.createHash('md5');
            hash.update(asset.data);
            t.strictEqual(hash.digest('hex'), assetInfo.md5);
        }
    };
    for (var i = 0; i < testAssets.length; ++i) {
        const assetInfo = testAssets[i];

        const promise = storage.load(assetInfo.type, assetInfo.id);
        t.type(promise, 'Promise');

        promises.push(promise);

        promise.then(asset => checkAsset(assetInfo, asset));
    }

    return Promise.all(promises);
});
