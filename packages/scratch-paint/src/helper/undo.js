// undo functionality
// modifed from https://github.com/memononen/stylii
import paper from 'paper';

const performSnapshot = function (dispatchPerformSnapshot) {
    dispatchPerformSnapshot({
        json: paper.project.exportJSON({asString: false})
    });

    // @todo enable/disable buttons
    // updateButtonVisibility();
};

const _restore = function (entry, onUpdateSvg) {
    for (const layer of paper.project.layers) {
        layer.removeChildren();
    }
    paper.project.clear();
    paper.project.importJSON(entry.json);
    paper.view.update();
    onUpdateSvg(true /* skipSnapshot */);
};

const performUndo = function (undoState, dispatchPerformUndo, onUpdateSvg) {
    if (undoState.pointer > 0) {
        _restore(undoState.stack[undoState.pointer - 1], onUpdateSvg);
        dispatchPerformUndo();

        // @todo enable/disable buttons
        // updateButtonVisibility();
    }
};


const performRedo = function (undoState, dispatchPerformRedo, onUpdateSvg) {
    if (undoState.pointer >= 0 && undoState.pointer < undoState.stack.length - 1) {
        _restore(undoState.stack[undoState.pointer + 1], onUpdateSvg);
        dispatchPerformRedo();
        
        // @todo enable/disable buttons
        // updateButtonVisibility();
    }
};

export {
    performSnapshot,
    performUndo,
    performRedo
};
