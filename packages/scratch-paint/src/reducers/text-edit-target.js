import log from '../log/log';

const CHANGE_TEXT_EDIT_TARGET = 'scratch-paint/text-tool/CHANGE_TEXT_EDIT_TARGET';
const initialState = null;

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case CHANGE_TEXT_EDIT_TARGET:
        if (typeof action.textEditTargetId === 'undefined') {
            log.warn(`Text edit target should not be set to undefined. Use null.`);
            return state;
        } else if (typeof action.textEditTargetId === 'undefined' || isNaN(action.textEditTargetId)) {
            log.warn(`Text edit target should be an item ID number. Got: ${action.textEditTargetId}`);
            return state;
        }
        return action.textEditTargetId;
    default:
        return state;
    }
};

// Action creators ==================================
/**
 * Set the currently-being-edited text field to the given item ID
 * @param {?number} textEditTargetId The paper.Item ID of the active text field.
 *     Leave empty if there is no text editing target.
 * @returns {object} Redux action to change the text edit target.
 */
const setTextEditTarget = function (textEditTargetId) {
    return {
        type: CHANGE_TEXT_EDIT_TARGET,
        textEditTargetId: textEditTargetId ? textEditTargetId : null
    };
};

export {
    reducer as default,
    setTextEditTarget
};
