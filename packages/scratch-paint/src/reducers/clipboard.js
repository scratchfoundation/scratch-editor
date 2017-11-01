import log from '../log/log';

const SET = 'scratch-paint/clipboard/SET';
const INCREMENT_PASTE_OFFSET = 'scratch-paint/clipboard/INCREMENT_PASTE_OFFSET';
const CLEAR_PASTE_OFFSET = 'scratch-paint/clipboard/CLEAR_PASTE_OFFSET';
const initialState = {
    items: [],
    pasteOffset: 0
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case SET:
        if (!action.clipboardItems || !(action.clipboardItems instanceof Array) || action.clipboardItems.length === 0) {
            log.warn(`Invalid clipboard item format`);
            return state;
        }
        return {
            items: action.clipboardItems,
            pasteOffset: 1
        };
    case INCREMENT_PASTE_OFFSET:
        return {
            items: state.items,
            pasteOffset: state.pasteOffset + 1
        };
    case CLEAR_PASTE_OFFSET:
        return {
            items: state.items,
            pasteOffset: 0
        };
    default:
        return state;
    }
};

// Action creators ==================================
const setClipboardItems = function (clipboardItems) {
    return {
        type: SET,
        clipboardItems: clipboardItems
    };
};

const incrementPasteOffset = function () {
    return {
        type: INCREMENT_PASTE_OFFSET
    };
};

const clearPasteOffset = function () {
    return {
        type: CLEAR_PASTE_OFFSET
    };
};

export {
    reducer as default,
    setClipboardItems,
    incrementPasteOffset,
    clearPasteOffset
};
