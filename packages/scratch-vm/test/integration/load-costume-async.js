/**
 * Tests that loadVector_ correctly awaits the async loadSvgString pipeline.
 *
 * Uses t.mockRequire to substitute a delayed loadSvgString, verifying that
 * load-costume properly awaits the async result before proceeding.
 */
const tap = require('tap');

const ORIGINAL_SVG = '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>';
const FIXED_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" width="10" height="10"><rect/></svg>';

const createMockAsset = (svgString, assetId = 'test-asset-id') => ({
    assetId,
    assetType: {runtimeFormat: 'svg'},
    dataFormat: 'svg',
    data: Buffer.from(svgString, 'utf8'),
    _text: svgString,
    decodeText () {
        return this._text;
    },
    encodeTextData (text, format, generateId) {
        this._text = text;
        this.data = Buffer.from(text, 'utf8');
        if (generateId) {
            this.assetId = `new-asset-id-${text.length}`;
        }
    }
});

const createMockRuntime = () => ({
    storage: {
        DataFormat: {SVG: 'svg'},
        AssetType: {ImageVector: {runtimeFormat: 'svg'}}
    },
    renderer: {
        createSVGSkin () {
            return Promise.resolve(42);
        },
        getSkinSize () {
            return [100, 80];
        },
        getSkinRotationCenter () {
            return [50, 40];
        }
    }
});

tap.test('loadVector_ awaits async loadSvgString before creating skin', async t => {
    let resolveLoad;
    const loadPromise = new Promise(resolve => {
        resolveLoad = resolve;
    });

    const {loadCostumeFromAsset} = t.mockRequire('../../src/import/load-costume', {
        '@scratch/scratch-svg-renderer': {
            loadSvgString () {
                return loadPromise;
            },
            serializeSvgToString () {
                return FIXED_SVG;
            }
        }
    });

    const runtime = createMockRuntime();
    let skinCreated = false;
    runtime.renderer.createSVGSkin = () => {
        skinCreated = true;
        return Promise.resolve(42);
    };

    const costume = {
        asset: createMockAsset(ORIGINAL_SVG),
        assetId: 'id',
        md5: 'id.svg',
        dataFormat: 'svg',
        name: 'test'
    };

    const resultPromise = loadCostumeFromAsset(costume, runtime, 2);

    // Skin should not be created yet — loadSvgString hasn't resolved.
    t.equal(skinCreated, false, 'skin not created before loadSvgString resolves');

    // Now resolve the async load.
    resolveLoad({mock: true});
    await resultPromise;

    t.equal(skinCreated, true, 'skin created after loadSvgString resolves');
    t.equal(costume.skinId, 42);
});

tap.test('loadVector_ handles loadSvgString rejection gracefully', async t => {
    const {loadCostumeFromAsset} = t.mockRequire('../../src/import/load-costume', {
        '@scratch/scratch-svg-renderer': {
            loadSvgString () {
                return Promise.reject(new Error('measurement failed'));
            },
            serializeSvgToString () {
                return '';
            }
        }
    });

    const runtime = createMockRuntime();
    runtime.storage.defaultAssetId = {ImageVector: 'default-vector-id'};
    runtime.storage.get = assetId => createMockAsset(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"></svg>',
        assetId
    );

    const costume = {
        asset: createMockAsset(ORIGINAL_SVG, 'broken-id'),
        assetId: 'broken-id',
        md5: 'broken-id.svg',
        dataFormat: 'svg',
        name: 'broken-costume'
    };

    const result = await loadCostumeFromAsset(costume, runtime, 2);

    t.ok(result.broken, 'costume is marked as broken on rejection');
    t.equal(result.broken.assetId, 'broken-id');
});
