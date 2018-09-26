import log from '../log/log';
import {CHANGE_SELECTED_ITEMS} from './selected-items';
import {CHANGE_STROKE_WIDTH} from './stroke-width';
import {getColorsFromSelection, MIXED} from '../helper/style-path';

const CHANGE_STROKE_COLOR = 'scratch-paint/stroke-color/CHANGE_STROKE_COLOR';
const initialState = '#000';
// Matches hex colors
const regExp = /^#([0-9a-f]{3}){1,2}$/i;

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case CHANGE_STROKE_WIDTH:
        if (Math.max(0, action.strokeWidth) === 0) {
            return null;
        }
        return state;
    case CHANGE_STROKE_COLOR:
        if (!regExp.test(action.strokeColor) && action.strokeColor !== null && action.strokeColor !== MIXED) {
            log.warn(`Invalid hex color code: ${action.fillColor}`);
            return state;
        }
        return action.strokeColor;
    case CHANGE_SELECTED_ITEMS:
        // Don't change state if no selection
        if (!action.selectedItems || !action.selectedItems.length) {
            return state;
        }
        // Bitmap mode doesn't have stroke color
        if (action.bitmapMode) {
            return state;
        }
        return getColorsFromSelection(action.selectedItems, action.bitmapMode).strokeColor;
    default:
        return state;
    }
};

// Action creators ==================================
const changeStrokeColor = function (strokeColor) {
    return {
        type: CHANGE_STROKE_COLOR,
        strokeColor: strokeColor
    };
};

export {
    reducer as default,
    changeStrokeColor
};
