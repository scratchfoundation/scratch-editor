# scratch-svg-renderer

[![Greenkeeper badge](https://badges.greenkeeper.io/LLK/scratch-svg-renderer.svg)](https://greenkeeper.io/)
A class built for importing SVGs into [Scratch](https://github.com/LLK/scratch-gui). Imports an SVG string to a DOM element or an HTML canvas. Handles some of the quirks with Scratch 2.0 SVGs, which sometimes misreport their width, height and view box.

## Installation
This requires you to have Git and Node.js installed.

To install as a dependency for your own application:
```bash
npm install scratch-svg-renderer
```
To set up a development environment to edit scratch-svg-renderer yourself:
```bash
git clone https://github.com/LLK/scratch-svg-renderer.git
cd scratch-svg-renderer
npm install
```

## How to include in a Node.js App
```js
import SvgRenderer from 'scratch-svg-renderer';

var svgRenderer = new SvgRenderer();
svgRenderer.fromString(svgData, callback);
```

## Donate
We provide [Scratch](https://scratch.mit.edu) free of charge, and want to keep it that way! Please consider making a [donation](https://secure.donationpay.org/scratchfoundation/) to support our continued engineering, design, community, and resource development efforts. Donations of any size are appreciated. Thank you!