// undo functionality
// modifed from https://github.com/memononen/stylii
import paper from '@scratch/paper';
import {hideGuideLayers, showGuideLayers, getRaster} from '../helper/layer';
import {getSelectedLeafItems} from '../helper/selection';
import Formats, {isVector, isBitmap} from '../lib/format';
import log from '../log/log';

/**
 * Take an undo snapshot
 * @param {function} dispatchPerformSnapshot Callback to dispatch a state update
 * @param {Formats} format Either Formats.BITMAP or Formats.VECTOR
 */
const performSnapshot = function (dispatchPerformSnapshot, format) {
    if (!format) {
        log.error('Format must be specified.');
    }
    const guideLayers = hideGuideLayers();
    dispatchPerformSnapshot({
        json: paper.project.exportJSON({asString: false}),
        paintEditorFormat: format
    });
    showGuideLayers(guideLayers);
};

const _restore = function (entry, setSelectedItems, onUpdateImage, isBitmapMode) {
    for (let i = paper.project.layers.length - 1; i >= 0; i--) {
        const layer = paper.project.layers[i];
        if (!layer.data.isBackgroundGuideLayer &&
            !layer.data.isDragCrosshairLayer &&
            !layer.data.isOutlineLayer) {
            layer.removeChildren();
            layer.remove();
        }
    }
    paper.project.importJSON(entry.json);
    setSelectedItems();

    // Ensure that all rasters are loaded before updating storage with new image data.
    const rastersThatNeedToLoad = [];
    const onLoad = () => {
        if (!getRaster().loaded) return;
        for (const raster of rastersThatNeedToLoad) {
            if (!raster.loaded) return;
        }
        onUpdateImage(true /* skipSnapshot */);
    };

    // Bitmap mode should have at most 1 selected item
    if (isBitmapMode) {
        const selectedItems = getSelectedLeafItems();
        if (selectedItems.length === 1 && selectedItems[0] instanceof paper.Raster) {
            rastersThatNeedToLoad.push(selectedItems[0]);
            if (selectedItems[0].data && selectedItems[0].data.expanded instanceof paper.Raster) {
                rastersThatNeedToLoad.push(selectedItems[0].data.expanded);
            }
        }
    }

    getRaster().onLoad = onLoad;
    for (const raster of rastersThatNeedToLoad) {
        raster.onLoad = onLoad;
        if (raster.loaded) raster.onLoad();
    }
};

const performUndo = function (undoState, dispatchPerformUndo, setSelectedItems, onUpdateImage) {
    if (undoState.pointer > 0) {
        const state = undoState.stack[undoState.pointer - 1];
        _restore(state, setSelectedItems, onUpdateImage, isBitmap(state.paintEditorFormat));
        const format = isVector(state.paintEditorFormat) ? Formats.VECTOR_SKIP_CONVERT :
            isBitmap(state.paintEditorFormat) ? Formats.BITMAP_SKIP_CONVERT : null;
        dispatchPerformUndo(format);
    }
};


const performRedo = function (undoState, dispatchPerformRedo, setSelectedItems, onUpdateImage) {
    if (undoState.pointer >= 0 && undoState.pointer < undoState.stack.length - 1) {
        const state = undoState.stack[undoState.pointer + 1];
        _restore(state, setSelectedItems, onUpdateImage, isBitmap(state.paintEditorFormat));
        const format = isVector(state.paintEditorFormat) ? Formats.VECTOR_SKIP_CONVERT :
            isBitmap(state.paintEditorFormat) ? Formats.BITMAP_SKIP_CONVERT : null;
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
