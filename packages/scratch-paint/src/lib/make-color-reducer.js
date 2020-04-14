import log from '../log/log';
import {CHANGE_SELECTED_ITEMS} from '../reducers/selected-items';
import {CLEAR_GRADIENT} from '../reducers/selection-gradient-type';
import {getColorsFromSelection, MIXED} from '../helper/style-path';
import GradientTypes from './gradient-types';

// Matches hex colors
const hexRegex = /^#([0-9a-f]{3}){1,2}$/i;

const isValidHexColor = color => {
    if (!hexRegex.test(color) && color !== null && color !== MIXED) {
        log.warn(`Invalid hex color code: ${color}`);
        return false;
    }
    return true;
};

const makeColorReducer = ({
    changePrimaryColorAction,
    changeSecondaryColorAction,
    defaultColor,
    selectionPrimaryColorKey,
    selectionSecondaryColorKey,
    selectionGradientTypeKey
}) => function colorReducer (state, action) {
    if (typeof state === 'undefined') {
        state = {
            primary: defaultColor,
            secondary: null
        };
    }
    switch (action.type) {
    case changePrimaryColorAction:
        if (!isValidHexColor(action.color)) return state;
        return {...state, primary: action.color};
    case changeSecondaryColorAction:
        if (!isValidHexColor(action.color)) return state;
        return {...state, secondary: action.color};
    case CHANGE_SELECTED_ITEMS: {
        // Don't change state if no selection
        if (!action.selectedItems || !action.selectedItems.length) {
            return state;
        }
        const colors = getColorsFromSelection(action.selectedItems, action.bitmapMode);

        const newState = {...state, primary: colors[selectionPrimaryColorKey]};

        // Gradient type may be solid when multiple gradient types are selected.
        // In this case, changing the first color should not change the second color.
        if (colors[selectionGradientTypeKey] !== GradientTypes.SOLID || colors[selectionSecondaryColorKey] === MIXED) {
            newState.secondary = colors[selectionSecondaryColorKey];
        }
        return newState;
    }
    case CLEAR_GRADIENT:
        return {...state, secondary: null};
    default:
        return state;
    }
};

export default makeColorReducer;
