import log from '../log/log';

const CHANGE_HOVERED = 'scratch-paint/hover/CHANGE_HOVERED';
const initialState = null;

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case CHANGE_HOVERED:
        if (typeof action.hoveredItemId === 'undefined') {
            log.warn(`Hovered item should not be set to undefined. Use null.`);
            return state;
        } else if (typeof action.hoveredItemId === 'undefined' || isNaN(action.hoveredItemId)) {
            log.warn(`Hovered item should be an item ID number. Got: ${action.hoveredItemId}`);
            return state;
        }
        return action.hoveredItemId;
    default:
        return state;
    }
};

// Action creators ==================================
/**
 * Set the hovered item state to the given item ID
 * @param {number} hoveredItemId The paper.Item ID of the hover indicator item.
 * @return {object} Redux action to change the hovered item.
 */
const setHoveredItem = function (hoveredItemId) {
    return {
        type: CHANGE_HOVERED,
        hoveredItemId: hoveredItemId
    };
};

const clearHoveredItem = function () {
    return {
        type: CHANGE_HOVERED,
        hoveredItemId: null
    };
};

export {
    reducer as default,
    setHoveredItem,
    clearHoveredItem
};
