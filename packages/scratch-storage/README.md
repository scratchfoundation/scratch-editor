## scratch-storage
#### Scratch Storage is a library for loading and storing project and asset files for Scratch 3.0

[![CircleCI](https://circleci.com/gh/LLK/scratch-storage/tree/develop.svg?style=shield&circle-token=171bbb6a82280e98afbfcedd8aa90b95b13b5de3)](https://circleci.com/gh/LLK/scratch-storage?branch=develop)

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
        asset.dataFormat,
        '/get/'
    ];
    return assetUrlParts.join('');
};
```

Then, let the storage module know about your source:
```js
storage.addWebStore(
    [AssetType.ImageVector, AssetType.ImageBitmap, AssetType.Sound],
    getAssetUrl);
```

If you're using ES6 you may be able to simplify all of the above quite a bit:
```js
storage.addWebStore(
    [AssetType.ImageVector, AssetType.ImageBitmap, AssetType.Sound],
    asset => `https://assets.example.com/path/to/assets/${asset.assetId}.${asset.dataFormat}/get/`);
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

## Committing
This project uses [semantic release](https://github.com/semantic-release/semantic-release)
to ensure version bumps follow semver so that projects using the config don't
break unexpectedly.

In order to automatically determine the type of version bump necessary, semantic
release expects commit messages to be formatted following
[conventional-changelog](https://github.com/bcoe/conventional-changelog-standard/blob/master/convention.md).
```
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

`subject` and `body` are your familiar commit subject and body. `footer` is
where you would include `BREAKING CHANGE` and `ISSUES FIXED` sections if
applicable.

`type` is one of:
* `fix`: A bug fix **Causes a patch release (0.0.x)**
* `feat`: A new feature **Causes a minor release (0.x.0)**
* `docs`: Documentation only changes
* `style`: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
* `refactor`: A code change that neither fixes a bug nor adds a feature
* `perf`: A code change that improves performance **May or may not cause a minor release. It's not clear.**
* `test`: Adding missing tests or correcting existing tests
* `ci`: Changes to our CI configuration files and scripts (example scopes: Travis, Circle, BrowserStack, SauceLabs)
* `chore`: Other changes that don't modify src or test files
* `revert`: Reverts a previous commit

Use the [commitizen CLI](https://github.com/commitizen/cz-cli) to make commits
formatted in this way:

```bash
npm install -g commitizen
npm install
```

Now you're ready to make commits using `git cz`.

## Breaking changes
If you're committing a change that makes an API change, or will
otherwise require changes to existing code, ensure your commit specifies a
breaking change.  In your commit body, prefix the changes with "BREAKING CHANGE: "
This will cause a major version bump so downstream projects must choose to upgrade
and will not break the build unexpectedly.

## Donate
We provide [Scratch](https://scratch.mit.edu) free of charge, and want to keep it that way! Please consider making a
[donation](https://secure.donationpay.org/scratchfoundation/) to support our continued engineering, design, community,
and resource development efforts. Donations of any size are appreciated. Thank you!
