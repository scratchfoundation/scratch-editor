import log from '../log/log';
import {CHANGE_SELECTED_ITEMS} from './selected-items';
import {getColorsFromSelection} from '../helper/style-path';

const CHANGE_STROKE_WIDTH = 'scratch-paint/stroke-width/CHANGE_STROKE_WIDTH';
const MAX_STROKE_WIDTH = 100;
const initialState = 4;

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case CHANGE_STROKE_WIDTH:
        if (isNaN(action.strokeWidth)) {
            log.warn(`Invalid brush size: ${action.strokeWidth}`);
            return state;
        }
        return Math.min(MAX_STROKE_WIDTH, Math.max(0, action.strokeWidth));
    case CHANGE_SELECTED_ITEMS:
        // Don't change state if no selection
        if (!action.selectedItems || !action.selectedItems.length) {
            return state;
        }
        // Bitmap mode doesn't have stroke width
        if (action.bitmapMode) {
            return state;
        }
        return getColorsFromSelection(action.selectedItems, action.bitmapMode).strokeWidth;
    default:
        return state;
    }
};

// Action creators ==================================
const changeStrokeWidth = function (strokeWidth) {
    return {
        type: CHANGE_STROKE_WIDTH,
        strokeWidth: strokeWidth
    };
};

export {
    reducer as default,
    changeStrokeWidth,
    CHANGE_STROKE_WIDTH,
    MAX_STROKE_WIDTH
};
