import {combineReducers} from 'redux';
import fillModeGradientTypeReducer from './fill-mode-gradient-type';
import colorIndexReducer from './color-index';

export default combineReducers({
    gradientType: fillModeGradientTypeReducer,
    colorIndex: colorIndexReducer
});
