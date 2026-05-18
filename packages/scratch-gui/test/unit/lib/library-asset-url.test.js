import {
    DEFAULT_LIBRARY_ASSET_HOST,
    buildLibraryAssetServiceUri
} from '../../../src/lib/library-asset-url';

describe('buildLibraryAssetServiceUri', () => {
    test('uses default MIT CDN host when host is empty', () => {
        expect(buildLibraryAssetServiceUri('', 'abc123', 'png')).toBe(
            'https://cdn.assets.scratch.mit.edu/internalapi/asset/abc123.png/get/'
        );
    });

    test('builds URL with custom host and separate id and format', () => {
        expect(buildLibraryAssetServiceUri(
            'http://localhost:3009/api/scratch/assets',
            'cd21514d0531fdffb22204e0ec5ed84a',
            'svg'
        )).toBe(
            'http://localhost:3009/api/scratch/assets/internalapi/asset/cd21514d0531fdffb22204e0ec5ed84a.svg/get/'
        );
    });

    test('builds URL with full md5ext', () => {
        expect(buildLibraryAssetServiceUri(
            'http://localhost:3009/api/scratch/assets',
            'cd21514d0531fdffb22204e0ec5ed84a.svg'
        )).toBe(
            'http://localhost:3009/api/scratch/assets/internalapi/asset/cd21514d0531fdffb22204e0ec5ed84a.svg/get/'
        );
    });

    test('strips trailing slash from host', () => {
        expect(buildLibraryAssetServiceUri(
            'http://localhost:3009/api/scratch/assets/',
            'test_image_1',
            'png'
        )).toBe(
            'http://localhost:3009/api/scratch/assets/internalapi/asset/test_image_1.png/get/'
        );
    });

    test('exports expected default host', () => {
        expect(DEFAULT_LIBRARY_ASSET_HOST).toBe('https://cdn.assets.scratch.mit.edu');
    });
});
