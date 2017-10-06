import PaintEditor from './containers/paint-editor.jsx';
import SelectionHOV from './containers/selection-hoc.jsx';
import ScratchPaintReducer from './reducers/scratch-paint-reducer';

const Wrapped = SelectionHOV(PaintEditor);

export {
    Wrapped as default,
    ScratchPaintReducer
};
