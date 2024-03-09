# scratch-svg-renderer

[![CI/CD](https://github.com/scratchfoundation/scratch-svg-renderer/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/scratchfoundation/scratch-svg-renderer/actions/workflows/ci-cd.yml)

A class built for importing SVGs into [Scratch](https://github.com/scratchfoundation/scratch-gui). Imports an SVG
string to a DOM element or an HTML canvas. Handles some of the quirks with Scratch 2.0 SVGs, which sometimes misreport
their width, height and view box.

## Installation

This requires you to have Git and Node.js installed.

To install as a dependency for your own application:

```bash
npm install scratch-svg-renderer
```

To set up a development environment to edit scratch-svg-renderer yourself:

```bash
git clone https://github.com/scratchfoundation/scratch-svg-renderer.git
cd scratch-svg-renderer
npm install
```

## How to include in a Node.js App

```js
import SvgRenderer from 'scratch-svg-renderer';

const svgRenderer = new SvgRenderer();

const svgData = "<svg>...</svg>";
const scale = 1;
const quirksMode = false; // If true, emulate Scratch 2.0 SVG rendering "quirks"
function doSomethingWith(canvas) {...};

svgRenderer.loadSVG(svgData, quirksMode, () => {
    svgRenderer.draw(scale);
    doSomethingWith(svgRenderer.canvas);
});
```

## How to run locally as part of scratch-gui

To run scratch-svg-renderer locally as part of scratch-gui, for development:

1. Set up local repositories (or pull updated code):
    1. scratch-svg-renderer (this repo)
    2. [scratch-render](https://github.com/scratchfoundation/scratch-render)
    3. [scratch-paint](https://github.com/scratchfoundation/scratch-paint)
    4. [scratch-gui](https://github.com/scratchfoundation/scratch-gui)
2. In each of the local repos above, run `npm install`
3. Run `npm link` in each of these local repos:
    1. scratch-svg-renderer
    2. scratch-render
    3. scratch-paint
4. Run `npm link scratch-svg-renderer` in each of these local repos:
    1. scratch-render
    2. scratch-paint
    3. scratch-gui
5. In your local scratch-gui repo:
    1. run `npm link scratch-render`
    2. run `npm link scratch-paint`
6. In scratch-gui, follow its instructions to run it or build its code

## Donate

We provide [Scratch](https://scratch.mit.edu) free of charge, and want to keep it that way! Please consider making a
[donation](https://secure.donationpay.org/scratchfoundation/) to support our continued engineering, design, community,
and resource development efforts. Donations of any size are appreciated. Thank you!

## Committing

This project uses [semantic release](https://github.com/semantic-release/semantic-release) to ensure version bumps
follow semver so that projects depending on it don't break unexpectedly.

In order to automatically determine version updates, semantic release expects commit messages to follow the
[conventional-changelog](https://github.com/bcoe/conventional-changelog-standard/blob/master/convention.md)
specification.

You can use the [commitizen CLI](https://github.com/commitizen/cz-cli) to make commits formatted in this way:

```bash
npm install -g commitizen@latest cz-conventional-changelog@latest
```

Now you're ready to make commits using `git cz`.
