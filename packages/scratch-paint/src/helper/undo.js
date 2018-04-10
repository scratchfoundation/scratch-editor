// undo functionality
// modifed from https://github.com/memononen/stylii
import paper from '@scratch/paper';
import {hideGuideLayers, showGuideLayers, getRaster} from '../helper/layer';
import Formats from '../lib/format';
import {isVector, isBitmap} from '../lib/format';
import log from '../log/log';

/**
 * Take an undo snapshot
 * @param {function} dispatchPerformSnapshot Callback to dispatch a state update
 * @param {Formats} format Either Formats.BITMAP or Formats.VECTOR
 */
const performSnapshot = function (dispatchPerformSnapshot, format) {
    const guideLayers = hideGuideLayers();
    dispatchPerformSnapshot({
        json: paper.project.exportJSON({asString: false}),
        paintEditorFormat: format
    });
    showGuideLayers(guideLayers);
};

const _restore = function (entry, setSelectedItems, onUpdateSvg) {
    for (let i = paper.project.layers.length - 1; i >= 0; i--) {
        const layer = paper.project.layers[i];
        if (!layer.data.isBackgroundGuideLayer) {
            layer.removeChildren();
            layer.remove();
        }
    }
    paper.project.importJSON(entry.json);

    setSelectedItems();
    getRaster().onLoad = function () {
        onUpdateSvg(true /* skipSnapshot */);
    };
    if (getRaster().loaded) {
        getRaster().onLoad();
    }
};

const performUndo = function (undoState, dispatchPerformUndo, setSelectedItems, onUpdateSvg) {
    if (undoState.pointer > 0) {
        const state = undoState.stack[undoState.pointer - 1];
        _restore(state, setSelectedItems, onUpdateSvg);
        const format = isVector(state.paintEditorFormat) ? Formats.VECTOR_SKIP_CONVERT :
            isBitmap(state.paintEditorFormat) ? Formats.BITMAP_SKIP_CONVERT : null;
        if (!format) {
            log.error(`Invalid format: ${state.paintEditorFormat}`);
        }
        dispatchPerformUndo(format);
    }
};


const performRedo = function (undoState, dispatchPerformRedo, setSelectedItems, onUpdateSvg) {
    if (undoState.pointer >= 0 && undoState.pointer < undoState.stack.length - 1) {
        const state = undoState.stack[undoState.pointer + 1];
        _restore(state, setSelectedItems, onUpdateSvg);
        const format = isVector(state.paintEditorFormat) ? Formats.VECTOR_SKIP_CONVERT :
            isBitmap(state.paintEditorFormat) ? Formats.BITMAP_SKIP_CONVERT : null;
        if (!format) {
            log.error(`Invalid format: ${state.paintEditorFormat}`);
        }
        dispatchPerformRedo(format);
    }
};

const shouldShowUndo = function (undoState) {
    return undoState.pointer > 0;
};

const shouldShowRedo = function (undoState) {
    return (undoState.pointer > -1 && undoState.pointer !== (undoState.stack.length - 1));
};

export {
    performSnapshot,
    performUndo,
    performRedo,
    shouldShowUndo,
    shouldShowRedo
};
