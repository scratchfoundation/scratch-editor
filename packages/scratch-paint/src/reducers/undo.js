import log from '../log/log';

const UNDO = 'scratch-paint/undo/UNDO';
const REDO = 'scratch-paint/undo/REDO';
const SNAPSHOT = 'scratch-paint/undo/SNAPSHOT';
const CLEAR = 'scratch-paint/undo/CLEAR';
const MAX_STACK_SIZE = 100;
const initialState = {
    stack: [],
    pointer: -1
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case UNDO:
        if (state.pointer <= 0) {
            log.warn(`Can't undo, undo stack is empty`);
            return state;
        }
        return {
            stack: state.stack,
            pointer: state.pointer - 1
        };
    case REDO:
        if (state.pointer <= -1 || state.pointer === state.stack.length - 1) {
            log.warn(`Can't redo, redo stack is empty`);
            return state;
        }
        return {
            stack: state.stack,
            pointer: state.pointer + 1
        };
    case SNAPSHOT:
        if (!action.snapshot) {
            log.warn(`Couldn't create undo snapshot, no data provided`);
            return state;
        }
        // Overflowed or about to overflow
        if (state.pointer >= MAX_STACK_SIZE - 1) {
            return {
                // Make a stack of size MAX_STACK_SIZE, cutting off the oldest snapshots.
                stack: state.stack.slice(state.pointer - MAX_STACK_SIZE + 2, state.pointer + 1).concat(action.snapshot),
                pointer: MAX_STACK_SIZE - 1
            };
        }
        return {
            // Performing an action clears the redo stack
            stack: state.stack.slice(0, state.pointer + 1).concat(action.snapshot),
            pointer: state.pointer + 1
        };
    case CLEAR:
        return initialState;
    default:
        return state;
    }
};

// Action creators ==================================
const undoSnapshot = function (snapshot) {
    return {
        type: SNAPSHOT,
        snapshot: snapshot
    };
};
/**
 * @param {Format} format Either VECTOR_SKIP_CONVERT or BITMAP_SKIP_CONVERT
 * @return {Action} undo action
 */
const undo = function (format) {
    return {
        type: UNDO,
        format: format
    };
};
/**
 * @param {Format} format Either VECTOR_SKIP_CONVERT or BITMAP_SKIP_CONVERT
 * @return {Action} undo action
 */
const redo = function (format) {
    return {
        type: REDO,
        format: format
    };
};
const clearUndoState = function () {
    return {
        type: CLEAR
    };
};

export {
    reducer as default,
    undo,
    redo,
    undoSnapshot,
    clearUndoState,
    MAX_STACK_SIZE,
    UNDO,
    REDO
};
