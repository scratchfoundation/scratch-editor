import {combineReducers} from 'redux';
import eyeDropperReducer from './eye-dropper';
import fillColorReducer from './fill-color';
import strokeColorReducer from './stroke-color';
import strokeWidthReducer from './stroke-width';

export default combineReducers({
    eyeDropper: eyeDropperReducer,
    fillColor: fillColorReducer,
    strokeColor: strokeColorReducer,
    strokeWidth: strokeWidthReducer
});
