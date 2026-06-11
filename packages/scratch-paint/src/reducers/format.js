import Formats from '../lib/format';
import log from '../log/log';
import {UNDO, REDO} from './undo';

const CHANGE_FORMAT = 'scratch-paint/formats/CHANGE_FORMAT';
const initialState = null;

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case UNDO:
        /* falls through */
    case REDO:
        /* falls through */
    case CHANGE_FORMAT:
        if (!action.format) return state;
        if (action.format in Formats) {
            return action.format;
        }
        log.warn(`Format does not exist: ${action.format}`);
        /* falls through */
    default:
        return state;
    }
};

// Action creators ==================================
const changeFormat = function (format) {
    return {
        type: CHANGE_FORMAT,
        format: format
    };
};

export {
    reducer as default,
    changeFormat
};
