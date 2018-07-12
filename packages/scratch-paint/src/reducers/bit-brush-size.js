import log from '../log/log';
import {CHANGE_SELECTED_ITEMS} from './selected-items';
import {getColorsFromSelection} from '../helper/style-path';

// Bit brush size affects bit brush width, circle/rectangle outline drawing width, and line width
// in the bitmap paint editor.
const CHANGE_BIT_BRUSH_SIZE = 'scratch-paint/brush-mode/CHANGE_BIT_BRUSH_SIZE';
const initialState = 10;

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case CHANGE_BIT_BRUSH_SIZE:
        if (isNaN(action.brushSize)) {
            log.warn(`Invalid brush size: ${action.brushSize}`);
            return state;
        }
        return Math.max(1, action.brushSize);
    case CHANGE_SELECTED_ITEMS:
    {
        // Don't change state if no selection
        if (!action.selectedItems || !action.selectedItems.length) {
            return state;
        }
        // Vector mode doesn't have bit width
        if (!action.bitmapMode) {
            return state;
        }
        const colorState = getColorsFromSelection(action.selectedItems, action.bitmapMode);
        if (colorState.thickness) return colorState.thickness;
        return state;
    }
    default:
        return state;
    }
};

// Action creators ==================================
const changeBitBrushSize = function (brushSize) {
    return {
        type: CHANGE_BIT_BRUSH_SIZE,
        brushSize: brushSize
    };
};

export {
    reducer as default,
    changeBitBrushSize
};
