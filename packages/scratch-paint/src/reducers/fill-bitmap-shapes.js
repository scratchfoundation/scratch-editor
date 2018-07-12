const SET_FILLED = 'scratch-paint/fill-bitmap-shapes/SET_FILLED';
const initialState = true;

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case SET_FILLED:
        return action.filled;
    default:
        return state;
    }
};

// Action creators ==================================
const setShapesFilled = function (filled) {
    return {
        type: SET_FILLED,
        filled: filled
    };
};

export {
    reducer as default,
    setShapesFilled
};
