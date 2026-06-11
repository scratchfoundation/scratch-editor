/**
 * @file Tests the build output to verify the general parts of the public API.
 */

const ScratchStorageModule = require('../../dist/node/scratch-storage.js');

/** @type {ScratchStorageModule.ScratchStorage} */
let storage;

beforeEach(() => {
    const {ScratchStorage} = ScratchStorageModule;
    storage = new ScratchStorage();
});

test('constructor', () => {
    const {ScratchStorage} = ScratchStorageModule;
    expect(storage).toBeInstanceOf(ScratchStorage);
});

test('DataFormat', () => {
    const {DataFormat} = ScratchStorageModule;
    expect(DataFormat).toBeDefined();
    expect(DataFormat.JPG).toBe('jpg');
    expect(DataFormat.JSON).toBe('json');
    expect(DataFormat.MP3).toBe('mp3');
    expect(DataFormat.PNG).toBe('png');
    expect(DataFormat.SB2).toBe('sb2');
    expect(DataFormat.SB3).toBe('sb3');
    expect(DataFormat.SVG).toBe('svg');
    expect(DataFormat.WAV).toBe('wav');
});

test('AssetType', () => {
    const {AssetType, DataFormat} = ScratchStorageModule;
    expect(AssetType).toBeDefined();
    expect(AssetType.ImageBitmap.contentType).toBe('image/png');
    expect(AssetType.ImageVector.contentType).toBe('image/svg+xml');
    expect(AssetType.Project.runtimeFormat).toBe(DataFormat.JSON);
    expect(AssetType.Sound.immutable).toBe(true);
    expect(AssetType.Sprite.name).toBe('Sprite');
});

test('Asset', () => {
    const {Asset, AssetType} = ScratchStorageModule;
    expect(Asset).toBeDefined();
    const asset = new Asset(
        AssetType.ImageVector,
        'some-hash'
    );
    expect(asset).toBeInstanceOf(Asset);
    expect(asset.dataFormat).toBe('svg');
    expect(asset.assetId).toBe('some-hash');
});

test('Helper', () => {
    const {Helper} = ScratchStorageModule;
    expect(Helper).toBeDefined();
    const helper = new Helper();
    expect(helper).toBeInstanceOf(Helper);
});
