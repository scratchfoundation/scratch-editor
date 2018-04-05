import {combineReducers} from 'redux';
import modeReducer from './modes';
import brushModeReducer from './brush-mode';
import eraserModeReducer from './eraser-mode';
import colorReducer from './color';
import clipboardReducer from './clipboard';
import formatReducer from './format';
import hoverReducer from './hover';
import modalsReducer from './modals';
import selectedItemReducer from './selected-items';
import textEditTargetReducer from './text-edit-target';
import viewBoundsReducer from './view-bounds';
import undoReducer from './undo';

export default combineReducers({
    mode: modeReducer,
    brushMode: brushModeReducer,
    color: colorReducer,
    clipboard: clipboardReducer,
    eraserMode: eraserModeReducer,
    format: formatReducer,
    hoveredItemId: hoverReducer,
    modals: modalsReducer,
    selectedItems: selectedItemReducer,
    textEditTarget: textEditTargetReducer,
    undo: undoReducer,
    viewBounds: viewBoundsReducer
});
