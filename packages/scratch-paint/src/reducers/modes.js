import Modes from '../lib/modes';
import log from '../log/log';

const CHANGE_MODE = 'scratch-paint/modes/CHANGE_MODE';
const initialState = Modes.SELECT;

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case CHANGE_MODE:
        if (action.mode in Modes) {
            return action.mode;
        }
        log.warn(`Mode does not exist: ${action.mode}`);
        /* falls through */
    default:
        return state;
    }
};

// Action creators ==================================
const changeMode = function (mode) {
    return {
        type: CHANGE_MODE,
        mode: mode
    };
};

export {
    reducer as default,
    changeMode
};
