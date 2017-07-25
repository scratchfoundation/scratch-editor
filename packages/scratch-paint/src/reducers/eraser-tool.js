const CHANGE_ERASER_SIZE = 'scratch-paint/tools/CHANGE_ERASER_SIZE';
const initialState = {brushSize: 20};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case CHANGE_ERASER_SIZE:
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

module.exports = reducer;
