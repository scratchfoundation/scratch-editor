import {combineReducers} from 'redux';
import modeReducer from './modes';
import brushModeReducer from './brush-mode';
import eraserModeReducer from './eraser-mode';
import colorReducer from './color';
import hoverReducer from './hover';
import selectedItemReducer from './selected-items';
import undoReducer from './undo';

export default combineReducers({
    mode: modeReducer,
    brushMode: brushModeReducer,
    eraserMode: eraserModeReducer,
    color: colorReducer,
    hoveredItemId: hoverReducer,
    selectedItems: selectedItemReducer,
    undo: undoReducer
});
