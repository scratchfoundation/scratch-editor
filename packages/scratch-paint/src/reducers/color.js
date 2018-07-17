import {combineReducers} from 'redux';
import eyeDropperReducer from './eye-dropper';
import fillColorReducer from './fill-color';
import fillColor2Reducer from './fill-color-2';
import gradientTypeReducer from './selection-gradient-type';
import strokeColorReducer from './stroke-color';
import strokeWidthReducer from './stroke-width';

export default combineReducers({
    eyeDropper: eyeDropperReducer,
    fillColor: fillColorReducer,
    fillColor2: fillColor2Reducer,
    gradientType: gradientTypeReducer,
    strokeColor: strokeColorReducer,
    strokeWidth: strokeWidthReducer
});
