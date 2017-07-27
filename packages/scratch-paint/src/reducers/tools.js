import ToolTypes from '../tools/tool-types';
import log from '../log/log';

const CHANGE_TOOL = 'scratch-paint/tools/CHANGE_TOOL';
const initialState = ToolTypes.BRUSH;

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case CHANGE_TOOL:
        if (action.tool instanceof ToolTypes) {
            return action.tool;
        }
        log.warn(`Warning: Tool type does not exist: ${action.tool}`);
        /* falls through */
    default:
        return state;
    }
};

// Action creators ==================================
reducer.changeTool = function (tool) {
    return {
        type: CHANGE_TOOL,
        tool: tool,
        meta: {
            throttle: 30
        }
    };
};

export default reducer;
