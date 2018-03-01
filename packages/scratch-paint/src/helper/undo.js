// undo functionality
// modifed from https://github.com/memononen/stylii
import paper from '@scratch/paper';
import {hideGuideLayers, showGuideLayers} from '../helper/layer';

const performSnapshot = function (dispatchPerformSnapshot) {
    const guideLayers = hideGuideLayers();
    dispatchPerformSnapshot({
        json: paper.project.exportJSON({asString: false})
    });
    showGuideLayers(guideLayers);
};

const _restore = function (entry, setSelectedItems, onUpdateSvg) {
    for (const layer of paper.project.layers) {
        if (!layer.data.isBackgroundGuideLayer) {
            layer.removeChildren();
            layer.remove();
        }
    }
    paper.project.importJSON(entry.json);

    setSelectedItems();
    onUpdateSvg(true /* skipSnapshot */);
};

const performUndo = function (undoState, dispatchPerformUndo, setSelectedItems, onUpdateSvg) {
    if (undoState.pointer > 0) {
        _restore(undoState.stack[undoState.pointer - 1], setSelectedItems, onUpdateSvg);
        dispatchPerformUndo();
    }
};


const performRedo = function (undoState, dispatchPerformRedo, setSelectedItems, onUpdateSvg) {
    if (undoState.pointer >= 0 && undoState.pointer < undoState.stack.length - 1) {
        _restore(undoState.stack[undoState.pointer + 1], setSelectedItems, onUpdateSvg);
        dispatchPerformRedo();
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
