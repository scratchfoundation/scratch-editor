import makeColorReducer from '../lib/make-color-reducer';

const CHANGE_FILL_COLOR = 'scratch-paint/fill-color/CHANGE_FILL_COLOR';
const CHANGE_FILL_COLOR_2 = 'scratch-paint/fill-color/CHANGE_FILL_COLOR_2';
const DEFAULT_COLOR = '#9966FF';

const reducer = makeColorReducer({
    changePrimaryColorAction: CHANGE_FILL_COLOR,
    changeSecondaryColorAction: CHANGE_FILL_COLOR_2,
    defaultColor: DEFAULT_COLOR,
    selectionPrimaryColorKey: 'fillColor',
    selectionSecondaryColorKey: 'fillColor2',
    selectionGradientTypeKey: 'gradientType'
});

// Action creators ==================================
const changeFillColor = function (fillColor) {
    return {
        type: CHANGE_FILL_COLOR,
        color: fillColor
    };
};

const changeFillColor2 = function (fillColor) {
    return {
        type: CHANGE_FILL_COLOR_2,
        color: fillColor
    };
};

export {
    reducer as default,
    changeFillColor,
    changeFillColor2,
    DEFAULT_COLOR
};
