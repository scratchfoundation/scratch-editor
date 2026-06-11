import log from '../log/log';

const CHANGE_BRUSH_SIZE = 'scratch-paint/brush-mode/CHANGE_BRUSH_SIZE';
const initialState = {brushSize: 10};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case CHANGE_BRUSH_SIZE:
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
        type: CHANGE_BRUSH_SIZE,
        brushSize: brushSize
    };
};

export {
    reducer as default,
    changeBrushSize
};
