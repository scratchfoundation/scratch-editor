import makeColorStyleReducer from '../lib/make-color-style-reducer';

const CHANGE_STROKE_COLOR = 'scratch-paint/stroke-style/CHANGE_STROKE_COLOR';
const CHANGE_STROKE_COLOR_2 = 'scratch-paint/stroke-style/CHANGE_STROKE_COLOR_2';
const CHANGE_STROKE_GRADIENT_TYPE = 'scratch-paint/stroke-style/CHANGE_STROKE_GRADIENT_TYPE';
const CLEAR_STROKE_GRADIENT = 'scratch-paint/stroke-style/CLEAR_STROKE_GRADIENT';
const DEFAULT_COLOR = '#000000';

import {CHANGE_STROKE_WIDTH} from './stroke-width';

const reducer = makeColorStyleReducer({
    changePrimaryColorAction: CHANGE_STROKE_COLOR,
    changeSecondaryColorAction: CHANGE_STROKE_COLOR_2,
    changeGradientTypeAction: CHANGE_STROKE_GRADIENT_TYPE,
    clearGradientAction: CLEAR_STROKE_GRADIENT,
    defaultColor: DEFAULT_COLOR,
    selectionPrimaryColorKey: 'strokeColor',
    selectionSecondaryColorKey: 'strokeColor2',
    selectionGradientTypeKey: 'strokeGradientType'
});

// This is mostly the same as the generated reducer, but with one piece of extra logic to set the color to null when the
// stroke width is set to 0.
// https://redux.js.org/recipes/structuring-reducers/reusing-reducer-logic
const strokeReducer = function (state, action) {
    if (action.type === CHANGE_STROKE_WIDTH && Math.max(action.strokeWidth, 0) === 0) {
        // TODO: this preserves the gradient type when you change the stroke width to 0.
        // Alternatively, we could set gradientType to SOLID instead of setting secondary to null, but since
        // the stroke width is automatically set to 0 as soon as a "null" color is detected (including a gradient for
        // which both colors are null), that would change the gradient type back to solid if you selected null for both
        // gradient colors.
        return {...state, primary: null, secondary: null};
    }

    return reducer(state, action);
};

// Action creators ==================================
const changeStrokeColor = function (strokeColor) {
    return {
        type: CHANGE_STROKE_COLOR,
        color: strokeColor
    };
};

const changeStrokeColor2 = function (strokeColor) {
    return {
        type: CHANGE_STROKE_COLOR_2,
        color: strokeColor
    };
};

const changeStrokeGradientType = function (gradientType) {
    return {
        type: CHANGE_STROKE_GRADIENT_TYPE,
        gradientType
    };
};

const clearStrokeGradient = function () {
    return {
        type: CLEAR_STROKE_GRADIENT
    };
};

export {
    strokeReducer as default,
    changeStrokeColor,
    changeStrokeColor2,
    changeStrokeGradientType,
    clearStrokeGradient,
    DEFAULT_COLOR,
    CHANGE_STROKE_GRADIENT_TYPE
};
