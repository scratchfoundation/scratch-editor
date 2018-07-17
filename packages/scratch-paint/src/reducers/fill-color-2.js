import log from '../log/log';
import {CHANGE_SELECTED_ITEMS} from './selected-items';
import {CLEAR_GRADIENT} from './selection-gradient-type';
import {MIXED, getColorsFromSelection} from '../helper/style-path';
import GradientTypes from '../lib/gradient-types';

const CHANGE_FILL_COLOR_2 = 'scratch-paint/fill-color/CHANGE_FILL_COLOR_2';
// Matches hex colors
const regExp = /^#([0-9a-f]{3}){1,2}$/i;

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = null;
    switch (action.type) {
    case CHANGE_FILL_COLOR_2:
        if (!regExp.test(action.fillColor) && action.fillColor !== null && action.fillColor !== MIXED) {
            log.warn(`Invalid hex color code: ${action.fillColor}`);
            return state;
        }
        return action.fillColor;
    case CHANGE_SELECTED_ITEMS:
    {
        // Don't change state if no selection
        if (!action.selectedItems || !action.selectedItems.length) {
            return state;
        }
        const colors = getColorsFromSelection(action.selectedItems);
        if (colors.gradientType === GradientTypes.SOLID) {
            // Gradient type may be solid when multiple gradient types are selected.
            // In this case, changing the first color should not change the second color.
            if (colors.fillColor2 === MIXED) return MIXED;
            return state;
        }
        return colors.fillColor2;
    }
    case CLEAR_GRADIENT:
        return null;
    default:
        return state;
    }
};

// Action creators ==================================
const changeFillColor2 = function (fillColor) {
    return {
        type: CHANGE_FILL_COLOR_2,
        fillColor: fillColor
    };
};

export {
    reducer as default,
    changeFillColor2
};
