import {combineReducers} from 'redux';
import modeReducer from './modes';
import bitBrushSizeReducer from './bit-brush-size';
import bitEraserSizeReducer from './bit-eraser-size';
import brushModeReducer from './brush-mode';
import eraserModeReducer from './eraser-mode';
import colorReducer from './color';
import clipboardReducer from './clipboard';
import cursorReducer from './cursor';
import fillBitmapShapesReducer from './fill-bitmap-shapes';
import fillModeReducer from './fill-mode';
import fontReducer from './font';
import formatReducer from './format';
import hoverReducer from './hover';
import layoutReducer from './layout';
import modalsReducer from './modals';
import selectedItemReducer from './selected-items';
import textEditTargetReducer from './text-edit-target';
import viewBoundsReducer from './view-bounds';
import undoReducer from './undo';
import zoomLevelsReducer from './zoom-levels';

export default combineReducers({
    mode: modeReducer,
    bitBrushSize: bitBrushSizeReducer,
    bitEraserSize: bitEraserSizeReducer,
    brushMode: brushModeReducer,
    color: colorReducer,
    clipboard: clipboardReducer,
    cursor: cursorReducer,
    eraserMode: eraserModeReducer,
    fillBitmapShapes: fillBitmapShapesReducer,
    fillMode: fillModeReducer,
    font: fontReducer,
    format: formatReducer,
    hoveredItemId: hoverReducer,
    layout: layoutReducer,
    modals: modalsReducer,
    selectedItems: selectedItemReducer,
    textEditTarget: textEditTargetReducer,
    undo: undoReducer,
    viewBounds: viewBoundsReducer,
    zoomLevels: zoomLevelsReducer
});
