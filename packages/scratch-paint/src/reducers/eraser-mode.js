import log from '../log/log';

const CHANGE_ERASER_SIZE = 'scratch-paint/eraser-mode/CHANGE_ERASER_SIZE';
const initialState = {brushSize: 40};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case CHANGE_ERASER_SIZE:
        if (isNaN(action.brushSize)) {
            log.warn(`Invalid brush size: ${action.brushSize}`);
            return state;
        }
        return {brushSize: Math.max(1, action.brushSize)};
    default:
        return state;
    }
};

// Action creators ==================================
const changeBrushSize = function (brushSize) {
    return {
        type: CHANGE_ERASER_SIZE,
        brushSize: brushSize
    };
};

export {
    reducer as default,
    changeBrushSize
};
