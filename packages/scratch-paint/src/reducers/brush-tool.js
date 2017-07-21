const CHANGE_BRUSH_SIZE = 'scratch-paint/tools/CHANGE_BRUSH_SIZE';
const initialState = {brushSize: 5};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case CHANGE_BRUSH_SIZE:
        return {brushSize: Math.max(1, action.brushSize)};
    default:
        return state;
    }
};

// Action creators ==================================
reducer.changeBrushSize = function (brushSize) {
    return {
        type: CHANGE_BRUSH_SIZE,
        brushSize: brushSize,
        meta: {
            throttle: 30
        }
    };
};

module.exports = reducer;
