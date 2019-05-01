const ScratchRender = require('../RenderWebGL');
const getMousePosition = require('./getMousePosition');

var canvas = document.getElementById('scratch-stage');
var fudge = 90;
var renderer = new ScratchRender(canvas);
renderer.setLayerGroupOrdering(['group1']);

var drawableID = renderer.createDrawable('group1');
renderer.updateDrawableProperties(drawableID, {
    position: [0, 0],
    scale: [100, 100],
    direction: 90
});

var drawableID2 = renderer.createDrawable('group1');
var wantBitmapSkin = false;

// Bitmap (squirrel)
var image = new Image();
image.addEventListener('load', () => {
    var bitmapSkinId = renderer.createBitmapSkin(image);
    if (wantBitmapSkin) {
        renderer.updateDrawableProperties(drawableID2, {
            skinId: bitmapSkinId
        });
    }
});
image.crossOrigin = 'anonymous';
image.src = 'https://cdn.assets.scratch.mit.edu/internalapi/asset/7e24c99c1b853e52f8e7f9004416fa34.png/get/';

// SVG (cat 1-a)
var xhr = new XMLHttpRequest();
xhr.addEventListener('load', function () {
    var skinId = renderer.createSVGSkin(xhr.responseText);
    if (!wantBitmapSkin) {
        renderer.updateDrawableProperties(drawableID2, {
            skinId: skinId
        });
    }
});
xhr.open('GET', 'https://cdn.assets.scratch.mit.edu/internalapi/asset/f88bf1935daea28f8ca098462a31dbb0.svg/get/');
xhr.send();

var posX = 0;
var posY = 0;
var scaleX = 100;
var scaleY = 100;
var fudgeProperty = 'posx';

const fudgePropertyInput = document.getElementById('fudgeproperty');
fudgePropertyInput.addEventListener('change', event => {
    fudgeProperty = event.target.value;
});

const fudgeInput = document.getElementById('fudge');

const fudgeMinInput = document.getElementById('fudgeMin');
fudgeMinInput.addEventListener('change', event => {
    fudgeInput.min = event.target.valueAsNumber;
});

const fudgeMaxInput = document.getElementById('fudgeMax');
fudgeMaxInput.addEventListener('change', event => {
    fudgeInput.max = event.target.valueAsNumber;
});

const handleFudgeChanged = function (event) {
    fudge = event.target.valueAsNumber;
    var props = {};
    switch (fudgeProperty) {
    case 'posx':
        props.position = [fudge, posY];
        posX = fudge;
        break;
    case 'posy':
        props.position = [posX, fudge];
        posY = fudge;
        break;
    case 'direction':
        props.direction = fudge;
        break;
    case 'scalex':
        props.scale = [fudge, scaleY];
        scaleX = fudge;
        break;
    case 'scaley':
        props.scale = [scaleX, fudge];
        scaleY = fudge;
        break;
    case 'color':
        props.color = fudge;
        break;
    case 'whirl':
        props.whirl = fudge;
        break;
    case 'fisheye':
        props.fisheye = fudge;
        break;
    case 'pixelate':
        props.pixelate = fudge;
        break;
    case 'mosaic':
        props.mosaic = fudge;
        break;
    case 'brightness':
        props.brightness = fudge;
        break;
    case 'ghost':
        props.ghost = fudge;
        break;
    }
    renderer.updateDrawableProperties(drawableID2, props);
};
fudgeInput.addEventListener('input', handleFudgeChanged);
fudgeInput.addEventListener('change', handleFudgeChanged);

canvas.addEventListener('mousemove', event => {
    var mousePos = getMousePosition(event, canvas);
    renderer.extractColor(mousePos.x, mousePos.y, 30);
});

canvas.addEventListener('click', event => {
    var mousePos = getMousePosition(event, canvas);
    var pickID = renderer.pick(mousePos.x, mousePos.y);
    console.log('You clicked on ' + (pickID < 0 ? 'nothing' : 'ID# ' + pickID));
    if (pickID >= 0) {
        console.dir(renderer.extractDrawable(pickID, mousePos.x, mousePos.y));
    }
});

const drawStep = function () {
    renderer.draw();
    // renderer.getBounds(drawableID2);
    // renderer.isTouchingColor(drawableID2, [255,255,255]);
    requestAnimationFrame(drawStep);
};
drawStep();

var debugCanvas = /** @type {canvas} */ document.getElementById('debug-canvas');
renderer.setDebugCanvas(debugCanvas);
