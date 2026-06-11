import log from '../log/log';

const CHANGE_BIT_ERASER_SIZE = 'scratch-paint/eraser-mode/CHANGE_BIT_ERASER_SIZE';
const initialState = 40;

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case CHANGE_BIT_ERASER_SIZE:
        if (isNaN(action.eraserSize)) {
            log.warn(`Invalid eraser size: ${action.eraserSize}`);
            return state;
        }
        return Math.max(1, action.eraserSize);
    default:
        return state;
    }
};

// Action creators ==================================
const changeBitEraserSize = function (eraserSize) {
    return {
        type: CHANGE_BIT_ERASER_SIZE,
        eraserSize: eraserSize
    };
};

export {
    reducer as default,
    changeBitEraserSize
};
