import log from '../log/log';
const SET_LAYOUT = 'scratch-paint/layout/SET_LAYOUT';
const initialState = {rtl: false};

const layouts = ['ltr', 'rtl'];

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case SET_LAYOUT:
        if (layouts.indexOf(action.layout) === -1) {
            log.warn(`Unrecognized layout provided: ${action.layout}`);
            return state;
        }
        return {rtl: action.layout === 'rtl'};
    default:
        return state;
    }
};

// Action creators ==================================
/**
 * Change the layout to the new layout
 * @param {string} layout either 'ltr' or 'rtl'
 * @returns {object} Redux action to change the selected items.
 */
const setLayout = function (layout) {
    return {
        type: SET_LAYOUT,
        layout: layout
    };
};


export {
    reducer as default,
    setLayout,
    SET_LAYOUT
};
