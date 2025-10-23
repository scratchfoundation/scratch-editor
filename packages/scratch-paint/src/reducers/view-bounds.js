import paper from '@scratch/paper';
import log from '../log/log';

const UPDATE_VIEW_BOUNDS = 'scratch-paint/view/UPDATE_VIEW_BOUNDS';
const initialState = new paper.Matrix(); // Identity

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case UPDATE_VIEW_BOUNDS:
        if (!(action.viewBounds instanceof paper.Matrix)) {
            log.warn(`View bounds should be a paper.Matrix.`);
            return state;
        }
        return action.viewBounds;
    default:
        return state;
    }
};

// Action creators ==================================
/**
 * Set the view bounds, which defines the zoom and scroll of the paper canvas.
 * @param {paper.Matrix} matrix The matrix applied to the view
 * @returns {object} Redux action to set the view bounds
 */
const updateViewBounds = function (matrix) {
    return {
        type: UPDATE_VIEW_BOUNDS,
        viewBounds: matrix.clone()
    };
};

export {
    reducer as default,
    updateViewBounds
};
