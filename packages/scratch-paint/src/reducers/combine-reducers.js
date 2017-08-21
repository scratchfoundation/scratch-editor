import {combineReducers} from 'redux';
import intlReducer from './intl';
import modeReducer from './modes';
import brushModeReducer from './brush-mode';
import eraserModeReducer from './eraser-mode';

export default combineReducers({
    intl: intlReducer,
    mode: modeReducer,
    brushMode: brushModeReducer,
    eraserMode: eraserModeReducer
});
