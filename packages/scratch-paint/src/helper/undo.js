// undo functionality
// modifed from https://github.com/memononen/stylii
import paper from '@scratch/paper';

const performSnapshot = function (dispatchPerformSnapshot) {
    dispatchPerformSnapshot({
        json: paper.project.exportJSON({asString: false})
    });

    // @todo enable/disable buttons
    // updateButtonVisibility();
};

const _restore = function (entry, setSelectedItems, onUpdateSvg) {
    for (const layer of paper.project.layers) {
        layer.removeChildren();
    }
    paper.project.clear();
    paper.project.importJSON(entry.json);
    paper.view.update();

    setSelectedItems();
    onUpdateSvg(true /* skipSnapshot */);
};

const performUndo = function (undoState, dispatchPerformUndo, setSelectedItems, onUpdateSvg) {
    if (undoState.pointer > 0) {
        _restore(undoState.stack[undoState.pointer - 1], setSelectedItems, onUpdateSvg);
        dispatchPerformUndo();

        // @todo enable/disable buttons
        // updateButtonVisibility();
    }
};


const performRedo = function (undoState, dispatchPerformRedo, setSelectedItems, onUpdateSvg) {
    if (undoState.pointer >= 0 && undoState.pointer < undoState.stack.length - 1) {
        _restore(undoState.stack[undoState.pointer + 1], setSelectedItems, onUpdateSvg);
        dispatchPerformRedo();
        
        // @todo enable/disable buttons
        // updateButtonVisibility();
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
