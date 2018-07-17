// Gradient type shown in the select tool
import GradientTypes from '../lib/gradient-types';
import {getColorsFromSelection} from '../helper/style-path';
import {CHANGE_SELECTED_ITEMS} from './selected-items';
import {CHANGE_GRADIENT_TYPE} from './fill-mode-gradient-type';
import log from '../log/log';

const CLEAR_GRADIENT = 'scratch-paint/selection-gradient-type/CLEAR_GRADIENT';
const initialState = GradientTypes.SOLID;

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case CHANGE_GRADIENT_TYPE:
        if (action.gradientType in GradientTypes) {
            return action.gradientType;
        }
        log.warn(`Gradient type does not exist: ${action.gradientType}`);
        return state;
    case CLEAR_GRADIENT:
        return GradientTypes.SOLID;
    case CHANGE_SELECTED_ITEMS:
        // Don't change state if no selection
        if (!action.selectedItems || !action.selectedItems.length) {
            return state;
        }
        return getColorsFromSelection(action.selectedItems, action.bitmapMode).gradientType;
    default:
        return state;
    }
};

// Action creators ==================================
const clearGradient = function () {
    return {
        type: CLEAR_GRADIENT
    };
};

export {
    reducer as default,
    CLEAR_GRADIENT,
    clearGradient
};
