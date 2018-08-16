import log from '../log/log';
const CHANGE_SELECTED_ITEMS = 'scratch-paint/select/CHANGE_SELECTED_ITEMS';
const REDRAW_SELECTION_BOX = 'scratch-paint/select/REDRAW_SELECTION_BOX';
const initialState = [];

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case REDRAW_SELECTION_BOX:
        if (state.length > 0) return state.slice(0); // Sends an update even though the items haven't changed
        return state;
    case CHANGE_SELECTED_ITEMS:
        if (!action.selectedItems || !(action.selectedItems instanceof Array)) {
            log.warn(`No selected items or wrong format provided: ${action.selectedItems}`);
            return state;
        }
        if (action.selectedItems.length > 1 && action.bitmapMode) {
            log.warn(`Multiselect should not be possible in bitmap mode: ${action.selectedItems}`);
            return state;
        }
        // If they are both empty, no change
        if (action.selectedItems.length === 0 && state.length === 0) {
            return state;
        }
        return action.selectedItems;
    default:
        return state;
    }
};

// Action creators ==================================
/**
 * Set the selected item state to the given array of items
 * @param {Array<paper.Item>} selectedItems from paper.project.selectedItems
 * @param {?boolean} bitmapMode True if the items are being selected in bitmap mode
 * @return {object} Redux action to change the selected items.
 */
const setSelectedItems = function (selectedItems, bitmapMode) {
    return {
        type: CHANGE_SELECTED_ITEMS,
        selectedItems: selectedItems,
        bitmapMode: bitmapMode
    };
};
const clearSelectedItems = function () {
    return {
        type: CHANGE_SELECTED_ITEMS,
        selectedItems: []
    };
};
const redrawSelectionBox = function () {
    return {
        type: REDRAW_SELECTION_BOX
    };
};

export {
    reducer as default,
    redrawSelectionBox,
    setSelectedItems,
    clearSelectedItems,
    CHANGE_SELECTED_ITEMS
};
