## scratch-storage
#### Scratch Storage is a library for loading and storing project and asset files for Scratch 3.0

[![Build Status](https://travis-ci.org/LLK/scratch-storage.svg?branch=develop)](https://travis-ci.org/LLK/scratch-storage)
[![Coverage Status](https://coveralls.io/repos/github/LLK/scratch-storage/badge.svg?branch=develop)](https://coveralls.io/github/LLK/scratch-storage?branch=develop)
[![Greenkeeper badge](https://badges.greenkeeper.io/LLK/scratch-storage.svg)](https://greenkeeper.io/)

## Installation
This requires you to have Node.js installed.

In your own Node.js environment/application:
```bash
npm install https://github.com/LLK/scratch-storage.git
```

If you want to edit/play yourself (requires Git):
```bash
git clone https://github.com/LLK/scratch-storage.git
cd scratch-storage
npm install
```

## Using scratch-storage

### From HTML

```html
<script src="scratch-storage/dist/web/scratch-storage.js"></script>
<script>
    var storage = new Scratch.Storage();
    // continue to "Storage API Quick Start" section below
</script>
```

### From Node.js / Webpack

```js
var storage = require('scratch-storage');
// continue to "Storage API Quick Start" section below
```

### Storage API Quick Start

Once you have an instance of `scratch-storage`, add some web sources. For each source you'll need to provide a function
to generate a URL for a supported type of asset:
```js
/**
 * @param {Asset} asset - calculate a URL for this asset.
 * @returns {string} a URL to download a project asset (PNG, WAV, etc.)
 */
var getAssetUrl = function (asset) {
    var assetUrlParts = [
        'https://assets.example.com/path/to/assets/',
        asset.assetId,
        '.',
        asset.assetType.runtimeFormat,
        '/get/'
    ];
    return assetUrlParts.join('');
};
```

Then, let the storage module know about your source:
```js
storage.addWebSource(
    [AssetType.ImageVector, AssetType.ImageBitmap, AssetType.Sound],
    getAssetUrl);
```

If you're using ES6 you may be able to simplify all of the above quite a bit:
```js
storage.addWebSource(
    [AssetType.ImageVector, AssetType.ImageBitmap, AssetType.Sound],
    asset => `https://assets.example.com/path/to/assets/${asset.assetId}.${asset.assetType.runtimeFormat}/get/`);
```

Once the storage module is aware of the sources you need, you can start loading assets:
```js
storage.load(AssetType.Sound, soundId).then(function (soundAsset) {
    // `soundAsset` is an `Asset` object. File contents are stored in `soundAsset.data`.
});
```

If you'd like to use `scratch-storage` with `scratch-vm` you must "attach" the storage module to the VM:
```js
vm.attachStorage(storage);
```

## Testing

To run all tests:
```bash
npm test
```

To show test coverage:
```bash
npm run coverage
```

## Donate
We provide [Scratch](https://scratch.mit.edu) free of charge, and want to keep it that way! Please consider making a
[donation](https://secure.donationpay.org/scratchfoundation/) to support our continued engineering, design, community,
and resource development efforts. Donations of any size are appreciated. Thank you!
