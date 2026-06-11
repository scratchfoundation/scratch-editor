import Fonts from '../lib/fonts';

const CHANGE_FONT = 'scratch-paint/fonts/CHANGE_FONT';
const initialState = Fonts.SANS_SERIF;

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case CHANGE_FONT:
        if (!action.font) return state;
        return action.font;
    default:
        return state;
    }
};

// Action creators ==================================
const changeFont = function (font) {
    return {
        type: CHANGE_FONT,
        font: font
    };
};

export {
    reducer as default,
    changeFont
};
