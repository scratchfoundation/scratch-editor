const initialState = {lineWidth: 2};

const reducer = function (state) {
    if (typeof state === 'undefined') state = initialState;
    return state;
};

// Action creators ==================================


export default reducer;
