import paper from '@scratch/paper';
import {CHANGE_SELECTED_ITEMS} from './selected-items';

const SET_FILLED = 'scratch-paint/fill-bitmap-shapes/SET_FILLED';
const initialState = true;

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case SET_FILLED:
        return action.filled;
    case CHANGE_SELECTED_ITEMS:
        if (action.bitmapMode &&
            action.selectedItems &&
            action.selectedItems[0] instanceof paper.Shape) {
            return action.selectedItems[0].strokeWidth === 0;
        }
        return state;
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
