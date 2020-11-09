const ScratchRender = require('../RenderWebGL');
const getMousePosition = require('./getMousePosition');

const renderCanvas = document.getElementById('renderCanvas');
const gpuQueryCanvas = document.getElementById('gpuQueryCanvas');
const cpuQueryCanvas = document.getElementById('cpuQueryCanvas');
const inputCursorX = document.getElementById('cursorX');
const inputCursorY = document.getElementById('cursorY');
const labelCursorPosition = document.getElementById('cursorPosition');
const labelGpuTouchingA = document.getElementById('gpuTouchingA');
const labelGpuTouchingB = document.getElementById('gpuTouchingB');
const labelCpuTouchingA = document.getElementById('cpuTouchingA');
const labelCpuTouchingB = document.getElementById('cpuTouchingB');

const drawables = {
    testPattern: -1,
    cursor: -1
};

const colors = {
    cursor: [255, 0, 0],
    patternA: [0, 255, 0],
    patternB: [0, 0, 255]
};

const renderer = new ScratchRender(renderCanvas);

const handleResizeRenderCanvas = () => {
    const halfWidth = renderCanvas.clientWidth / 2;
    const halfHeight = renderCanvas.clientHeight / 2;

    inputCursorX.style.width = `${renderCanvas.clientWidth}px`;
    inputCursorY.style.height = `${renderCanvas.clientHeight}px`;
    inputCursorX.min = -halfWidth;
    inputCursorX.max = halfWidth;
    inputCursorY.min = -halfHeight;
    inputCursorY.max = halfHeight;
};
renderCanvas.addEventListener('resize', handleResizeRenderCanvas);
handleResizeRenderCanvas();

const handleCursorPositionChanged = () => {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const cursorX = inputCursorX.valueAsNumber / devicePixelRatio;
    const cursorY = inputCursorY.valueAsNumber / devicePixelRatio;
    const positionHTML = `${cursorX}, ${cursorY}`;
    labelCursorPosition.innerHTML = positionHTML;
    if (drawables.cursor >= 0) {
        renderer.draw();
        renderer.updateDrawableProperties(drawables.cursor, {
            position: [cursorX, cursorY]
        });

        renderer.setUseGpuMode(ScratchRender.UseGpuModes.ForceGPU);
        renderer.setDebugCanvas(gpuQueryCanvas);
        const isGpuTouchingA = renderer.isTouchingColor(drawables.cursor, colors.patternA);
        const isGpuTouchingB = renderer.isTouchingColor(drawables.cursor, colors.patternB);
        labelGpuTouchingA.innerHTML = isGpuTouchingA ? 'yes' : 'no';
        labelGpuTouchingB.innerHTML = isGpuTouchingB ? 'yes' : 'no';

        renderer.setUseGpuMode(ScratchRender.UseGpuModes.ForceCPU);
        renderer.setDebugCanvas(cpuQueryCanvas);
        const isCpuTouchingA = renderer.isTouchingColor(drawables.cursor, colors.patternA);
        const isCpuTouchingB = renderer.isTouchingColor(drawables.cursor, colors.patternB);
        labelCpuTouchingA.innerHTML = isCpuTouchingA ? 'yes' : 'no';
        labelCpuTouchingB.innerHTML = isCpuTouchingB ? 'yes' : 'no';

        renderer.setUseGpuMode(ScratchRender.UseGpuModes.Automatic);
    }
};
inputCursorX.addEventListener('change', handleCursorPositionChanged);
inputCursorY.addEventListener('change', handleCursorPositionChanged);
inputCursorX.addEventListener('input', handleCursorPositionChanged);
inputCursorY.addEventListener('input', handleCursorPositionChanged);
handleCursorPositionChanged();

let trackingMouse = true;
const handleMouseMove = event => {
    if (trackingMouse) {
        const mousePosition = getMousePosition(event, renderCanvas);
        inputCursorX.value = mousePosition.x - (renderCanvas.clientWidth / 2);
        inputCursorY.value = (renderCanvas.clientHeight / 2) - mousePosition.y;
        handleCursorPositionChanged();
    }
};
renderCanvas.addEventListener('mousemove', handleMouseMove);

renderCanvas.addEventListener('click', event => {
    trackingMouse = !trackingMouse;
    if (trackingMouse) {
        handleMouseMove(event);
    }
});

const rgb2fillStyle = rgb => (
    `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`
);

const makeCursorImage = () => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;

    const context = canvas.getContext('2d');
    context.fillStyle = rgb2fillStyle(colors.cursor);
    context.fillRect(0, 0, 1, 1);

    return canvas;
};

const makeTestPatternImage = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 360;

    const patternA = rgb2fillStyle(colors.patternA);
    const patternB = rgb2fillStyle(colors.patternB);

    const context = canvas.getContext('2d');
    context.fillStyle = patternA;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = patternB;
    const xSplit1 = Math.floor(canvas.width * 0.25);
    const xSplit2 = Math.floor(canvas.width * 0.5);
    const xSplit3 = Math.floor(canvas.width * 0.75);
    const ySplit = Math.floor(canvas.height * 0.5);
    for (let y = 0; y < ySplit; y += 2) {
        context.fillRect(0, y, xSplit2, 1);
    }
    for (let x = xSplit2; x < canvas.width; x += 2) {
        context.fillRect(x, 0, 1, ySplit);
    }
    for (let x = 0; x < xSplit1; x += 2) {
        for (let y = ySplit; y < canvas.height; y += 2) {
            context.fillRect(x, y, 1, 1);
        }
    }
    for (let x = xSplit1; x < xSplit2; x += 3) {
        for (let y = ySplit; y < canvas.height; y += 3) {
            context.fillRect(x, y, 2, 2);
        }
    }
    for (let x = xSplit2; x < xSplit3; ++x) {
        for (let y = ySplit; y < canvas.height; ++y) {
            context.fillStyle = (x + y) % 2 ? patternB : patternA;
            context.fillRect(x, y, 1, 1);
        }
    }
    for (let x = xSplit3; x < canvas.width; x += 2) {
        for (let y = ySplit; y < canvas.height; y += 2) {
            context.fillStyle = (x + y) % 4 ? patternB : patternA;
            context.fillRect(x, y, 2, 2);
        }
    }

    return canvas;
};

const makeTestPatternDrawable = function (group) {
    const image = makeTestPatternImage();
    const skinId = renderer.createBitmapSkin(image, 1);
    const drawableId = renderer.createDrawable(group);
    renderer.updateDrawableProperties(drawableId, {skinId});
    return drawableId;
};

const makeCursorDrawable = function (group) {
    const image = makeCursorImage();
    const skinId = renderer.createBitmapSkin(image, 1, [0, 0]);
    const drawableId = renderer.createDrawable(group);
    renderer.updateDrawableProperties(drawableId, {skinId});
    return drawableId;
};

const initRendering = () => {
    const layerGroup = {
        testPattern: 'testPattern',
        cursor: 'cursor'
    };
    renderer.setLayerGroupOrdering([layerGroup.testPattern, layerGroup.cursor]);
    drawables.testPattern = makeTestPatternDrawable(layerGroup.testPattern);
    drawables.cursor = makeCursorDrawable(layerGroup.cursor);

    const corner00 = makeCursorDrawable(layerGroup.cursor);
    const corner01 = makeCursorDrawable(layerGroup.cursor);
    const corner10 = makeCursorDrawable(layerGroup.cursor);
    const corner11 = makeCursorDrawable(layerGroup.cursor);

    renderer.updateDrawableProperties(corner00, {position: [-240, -179]});
    renderer.updateDrawableProperties(corner01, {position: [-240, 180]});
    renderer.updateDrawableProperties(corner10, {position: [239, -179]});
    renderer.updateDrawableProperties(corner11, {position: [239, 180]});
};

initRendering();
renderer.draw();
