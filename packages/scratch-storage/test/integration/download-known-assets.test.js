const md5 = require('js-md5');

const ScratchStorage = require('../../src/index').default;

test('constructor', () => {
    const storage = new ScratchStorage();
    expect(storage).toBeInstanceOf(ScratchStorage);
});

/**
 * @typedef {object} AssetTestInfo
 * @property {AssetType} type - The type of the asset.
 * @property {string} id - The asset's unique ID.
 * @property {string} md5 - The asset's MD5 hash.
 * @property {DataFormat} [ext] - Optional: the asset's data format / file extension.
 */

/**
 * @param {ScratchStorage} storage The storage module.
 * @returns {AssetTestInfo[]} an array of asset info objects.
 */
const getTestAssets = storage => [
    // Project
    {
        type: storage.AssetType.Project,
        id: '117504922',
        md5: '1225460702e149727de28bff4cfd9e23'
    },
    // SVG without explicit extension
    {
        type: storage.AssetType.ImageVector,
        id: 'f88bf1935daea28f8ca098462a31dbb0', // cat1-a
        md5: 'f88bf1935daea28f8ca098462a31dbb0'
    },
    // SVG with explicit extension
    {
        type: storage.AssetType.ImageVector,
        id: '6e8bd9ae68fdb02b7e1e3df656a75635', // cat1-b
        md5: '6e8bd9ae68fdb02b7e1e3df656a75635',
        ext: storage.DataFormat.SVG
    },
    // PNG without explicit extension
    {
        type: storage.AssetType.ImageBitmap,
        id: '7e24c99c1b853e52f8e7f9004416fa34', // squirrel
        md5: '7e24c99c1b853e52f8e7f9004416fa34'
    },
    // PNG with explicit extension
    {
        type: storage.AssetType.ImageBitmap,
        id: '66895930177178ea01d9e610917f8acf', // bus
        md5: '66895930177178ea01d9e610917f8acf',
        ext: storage.DataFormat.PNG
    },
    // JPG with explicit extension
    {
        type: storage.AssetType.ImageBitmap,
        id: 'fe5e3566965f9de793beeffce377d054', // building at MIT
        md5: 'fe5e3566965f9de793beeffce377d054',
        ext: storage.DataFormat.JPG
    },
    // WAV without explicit extension
    {
        type: storage.AssetType.Sound,
        id: '83c36d806dc92327b9e7049a565c6bff', // meow
        md5: '83c36d806dc92327b9e7049a565c6bff' // wat
    }
];

const addWebStores = storage => {
    // these `asset => ...` callbacks generate values specifically for the cross-fetch mock
    // in the real world they would generate proper URIs
    storage.addWebStore(
        [storage.AssetType.Project],
        asset => asset.assetId,
        null, null);
    storage.addWebStore(
        [storage.AssetType.ImageVector, storage.AssetType.ImageBitmap, storage.AssetType.Sound],
        asset => `${asset.assetId}.${asset.dataFormat}`,
        null, null
    );
};

test('addWebStore', () => {
    const storage = new ScratchStorage();
    addWebStores(storage);
    expect(storage.webHelper.stores.length).toBe(2);
});

test('load', () => {
    const storage = new ScratchStorage();
    addWebStores(storage);
    const testAssets = getTestAssets(storage);
    const assetChecks = testAssets.map(async assetInfo => {
        const asset = await storage.load(assetInfo.type, assetInfo.id, assetInfo.ext)
            .catch(e => {
                if (e instanceof Array) {
                    // This is storage.load reporting one or more errors from individual tools.
                    e = e.flat();

                    if (e.length === 1) {
                        // If we just have one, it'll display well as-is. Don't bother wrapping it.
                        // Note that this still might be either an Error or a status code (see below).
                        e = e[0];
                    }
                }

                if (e instanceof Array) {
                    /* global AggregateError */
                    // we must have >1 error, so report it as an AggregateError (supported in Node 15+)
                    e = new AggregateError(
                        e.flat(),
                        `failed to load ${assetInfo.type.name} asset with id=${assetInfo.id}`
                    );
                    // Jest doesn't display AggregateError very well on its own
                    console.error(e);
                } else if (!(e instanceof Error)) {
                    // storage.load can throw a status like 403 or 500 which isn't an Error.
                    // That can look confusing in test output, so wrap it in an Error that will display well.
                    e = new Error(`failed to load ${assetInfo.type.name} asset with id=${assetInfo.id} (e=${e})`);
                }
                // else it's an Error that's already suitable for reporting

                throw e;
            });
        expect(asset).toBeInstanceOf(storage.Asset);
        expect(asset.assetId).toBe(assetInfo.id);
        expect(asset.assetType).toBe(assetInfo.type);
        expect(asset.data.length).toBeGreaterThan(0);

        // Web assets should come back as clean
        expect(asset.clean).toBeTruthy();

        if (assetInfo.md5) {
            // eslint-disable-next-line jest/no-conditional-expect
            expect(md5(asset.data)).toBe(assetInfo.md5);
        }
    });

    return Promise.all(assetChecks);
});
