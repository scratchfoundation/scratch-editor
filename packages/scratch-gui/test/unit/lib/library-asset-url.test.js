import {
    DEFAULT_LIBRARY_ASSET_URL_TEMPLATE,
    LIBRARY_ASSET_PATH_PLACEHOLDER,
    buildLibraryAssetServiceUri
} from '../../../src/lib/library-asset-url';

const MIT_SHAPED_TEMPLATE =
    'http://localhost:3009/api/scratch/assets/internalapi/asset/{assetPath}/get/';

describe('buildLibraryAssetServiceUri', () => {
    test('builds URL with default MIT-shaped template', () => {
        expect(buildLibraryAssetServiceUri(
            DEFAULT_LIBRARY_ASSET_URL_TEMPLATE,
            'abc123',
            'png'
        )).toBe(
            'https://cdn.assets.scratch.mit.edu/internalapi/asset/abc123.png/get/'
        );
    });

    test('builds URL with custom MIT-shaped template', () => {
        expect(buildLibraryAssetServiceUri(
            MIT_SHAPED_TEMPLATE,
            'cd21514d0531fdffb22204e0ec5ed84a',
            'svg'
        )).toBe(
            'http://localhost:3009/api/scratch/assets/internalapi/asset/cd21514d0531fdffb22204e0ec5ed84a.svg/get/'
        );
    });

    test('builds URL with full md5ext', () => {
        expect(buildLibraryAssetServiceUri(
            MIT_SHAPED_TEMPLATE,
            'cd21514d0531fdffb22204e0ec5ed84a.svg'
        )).toBe(
            'http://localhost:3009/api/scratch/assets/internalapi/asset/cd21514d0531fdffb22204e0ec5ed84a.svg/get/'
        );
    });

    test('supports alternate URL shapes using {assetPath}', () => {
        expect(buildLibraryAssetServiceUri(
            'https://editor-assets.raspberrypi.org/files/{assetPath}',
            'test_image_1',
            'png'
        )).toBe(
            'https://editor-assets.raspberrypi.org/files/test_image_1.png'
        );
    });

    test('exports expected default template and placeholder', () => {
        expect(LIBRARY_ASSET_PATH_PLACEHOLDER).toBe('{assetPath}');
        expect(DEFAULT_LIBRARY_ASSET_URL_TEMPLATE).toBe(
            'https://cdn.assets.scratch.mit.edu/internalapi/asset/{assetPath}/get/'
        );
    });
});
