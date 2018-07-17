import log from '../log/log';
import {CHANGE_SELECTED_ITEMS} from './selected-items';
import {getColorsFromSelection, MIXED} from '../helper/style-path';

const CHANGE_FILL_COLOR = 'scratch-paint/fill-color/CHANGE_FILL_COLOR';
const DEFAULT_COLOR = '#9966FF';
const initialState = DEFAULT_COLOR;
// Matches hex colors
const regExp = /^#([0-9a-f]{3}){1,2}$/i;

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case CHANGE_FILL_COLOR:
        if (!regExp.test(action.fillColor) && action.fillColor !== null && action.fillColor !== MIXED) {
            log.warn(`Invalid hex color code: ${action.fillColor}`);
            return state;
        }
        return action.fillColor;
    case CHANGE_SELECTED_ITEMS:
        // Don't change state if no selection
        if (!action.selectedItems || !action.selectedItems.length) {
            return state;
        }
        return getColorsFromSelection(action.selectedItems, action.bitmapMode).fillColor;
    default:
        return state;
    }
};

// Action creators ==================================
const changeFillColor = function (fillColor) {
    return {
        type: CHANGE_FILL_COLOR,
        fillColor: fillColor
    };
};

export {
    reducer as default,
    changeFillColor,
    DEFAULT_COLOR
};
