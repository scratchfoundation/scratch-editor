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
var wantPenSkin = false;

// Bitmap (squirrel)
var image = new Image();
image.addEventListener('load', () => {
    var bitmapSkinId = renderer.createBitmapSkin(image);
    if (wantBitmapSkin && !wantPenSkin) {
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
    if (!(wantBitmapSkin || wantPenSkin)) {
        renderer.updateDrawableProperties(drawableID2, {
            skinId: skinId
        });
    }
});
xhr.open('GET', 'https://cdn.assets.scratch.mit.edu/internalapi/asset/b7853f557e4426412e64bb3da6531a99.svg/get/');
xhr.send();

if (wantPenSkin) {
    var penSkinID = renderer.createPenSkin();

    renderer.updateDrawableProperties(drawableID2, {
        skinId: penSkinID
    });

    canvas.addEventListener('click', event => {
        let rect = canvas.getBoundingClientRect();

        let x = event.clientX - rect.left;
        let y = event.clientY - rect.top;

        renderer.penLine(penSkinID, {
            color4f: [Math.random(), Math.random(), Math.random(), 1],
            diameter: 8
        },
        x - 240, 180 - y, (Math.random() * 480) - 240, (Math.random() * 360) - 180);
    });
}

var posX = 0;
var posY = 0;
var scaleX = 100;
var scaleY = 100;
var fudgeProperty = 'posx';

const fudgeInput = document.getElementById('fudge');
const fudgePropertyInput = document.getElementById('fudgeproperty');
const fudgeMinInput = document.getElementById('fudgeMin');
const fudgeMaxInput = document.getElementById('fudgeMax');

/* eslint require-jsdoc: 0 */
const updateFudgeProperty = event => {
    fudgeProperty = event.target.value;
};

const updateFudgeMin = event => {
    fudgeInput.min = event.target.valueAsNumber;
};

const updateFudgeMax = event => {
    fudgeInput.max = event.target.valueAsNumber;
};

fudgePropertyInput.addEventListener('change', updateFudgeProperty);
fudgePropertyInput.addEventListener('init', updateFudgeProperty);

fudgeMinInput.addEventListener('change', updateFudgeMin);
fudgeMinInput.addEventListener('init', updateFudgeMin);

fudgeMaxInput.addEventListener('change', updateFudgeMax);
fudgeMaxInput.addEventListener('init', updateFudgeMax);

// Ugly hack to properly set the values of the inputs on page load,
// since they persist across reloads, at least in Firefox.
// The best ugly hacks are the ones that reduce code duplication!
fudgePropertyInput.dispatchEvent(new CustomEvent('init'));
fudgeMinInput.dispatchEvent(new CustomEvent('init'));
fudgeMaxInput.dispatchEvent(new CustomEvent('init'));
fudgeInput.dispatchEvent(new CustomEvent('init'));

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
    case 'scaleboth':
        props.scale = [fudge, fudge];
        scaleX = fudge;
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
fudgeInput.addEventListener('init', handleFudgeChanged);

const updateStageScale = event => {
    renderer.resize(480 * event.target.valueAsNumber, 360 * event.target.valueAsNumber);
};

const stageScaleInput = document.getElementById('stage-scale');

stageScaleInput.addEventListener('input', updateStageScale);
stageScaleInput.addEventListener('change', updateStageScale);

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
