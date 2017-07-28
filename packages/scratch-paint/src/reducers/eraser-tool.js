import log from '../log/log';

const CHANGE_ERASER_SIZE = 'scratch-paint/tools/CHANGE_ERASER_SIZE';
const initialState = {brushSize: 20};

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
reducer.changeBrushSize = function (brushSize) {
    return {
        type: CHANGE_ERASER_SIZE,
        brushSize: brushSize,
        meta: {
            throttle: 30
        }
    };
};

export default reducer;
