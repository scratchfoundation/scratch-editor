## scratch-render
#### WebGL-based rendering engine for Scratch 3.0

[![Build Status](https://travis-ci.org/LLK/scratch-render.svg?branch=develop)](https://travis-ci.org/LLK/scratch-render)
[![Dependency Status](https://david-dm.org/LLK/scratch-render.svg)](https://david-dm.org/LLK/scratch-render)
[![devDependency Status](https://david-dm.org/LLK/scratch-render/dev-status.svg)](https://david-dm.org/LLK/scratch-render#info=devDependencies)

## Installation
```bash
npm install https://github.com/LLK/scratch-render.git
```

## Setup
```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Scratch WebGL rendering demo</title>
    </head>

    <body>
        <canvas id="myStage"></canvas>
        <canvas id="myDebug"></canvas>
    </body>
</html>
```

```js
var canvas = document.getElementById('myStage');
var debug = document.getElementById('myDebugElement');

// Instantiate the renderer
var renderer = new require('scratch-render')(canvas);

// Connect to debug canvas
renderer.setDebugCanvas(document.getElementById('debug-canvas'));

// Start drawing
function drawStep() {
    renderer.draw();
    requestAnimationFrame(drawStep);
}
drawStep();

// Connect to worker (see "playground" example)
var worker = new Worker('worker.js');
renderer.connectWorker(worker);
```

## Standalone Build
```bash
npm run build
```

```html
<script src="/path/to/render.js"></script>
<script>
    var renderer = new window.RenderWebGLLocal();
    // do things
</script>
```

## Testing
```bash
npm test
```

## Donate
We provide [Scratch](https://scratch.mit.edu) free of charge, and want to keep it that way! Please consider making a [donation](https://secure.donationpay.org/scratchfoundation/) to support our continued engineering, design, community, and resource development efforts. Donations of any size are appreciated. Thank you!
