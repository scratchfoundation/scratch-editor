const getMousePosition = require('./getMousePosition');

const renderCanvas = document.getElementById('renderCanvas');
const inputCursorX = document.getElementById('cursorX');
const inputCursorY = document.getElementById('cursorY');
const labelCursorPosition = document.getElementById('cursorPosition');

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
    const cursorX = inputCursorX.valueAsNumber;
    const cursorY = inputCursorY.valueAsNumber;
    const positionHTML = `${cursorX}, ${cursorY}`;
    labelCursorPosition.innerHTML = positionHTML;
};
inputCursorX.addEventListener('change', handleCursorPositionChanged);
inputCursorY.addEventListener('change', handleCursorPositionChanged);
inputCursorX.addEventListener('input', handleCursorPositionChanged);
inputCursorY.addEventListener('input', handleCursorPositionChanged);
handleCursorPositionChanged();

let trackingMouse = true;
renderCanvas.addEventListener('click', event => {
    trackingMouse = !trackingMouse;
    if (trackingMouse) {
        handleMouseMove(event);
    }
});

const handleMouseMove = event => {
    if (trackingMouse) {
        const mousePosition = getMousePosition(event, renderCanvas);
        inputCursorX.value = mousePosition.x - (renderCanvas.clientWidth / 2);
        inputCursorY.value = (renderCanvas.clientHeight / 2) - mousePosition.y;
        handleCursorPositionChanged();
    }
};
renderCanvas.addEventListener('mousemove', handleMouseMove);
