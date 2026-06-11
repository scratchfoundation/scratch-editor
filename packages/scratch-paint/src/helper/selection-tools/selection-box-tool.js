import paper from '@scratch/paper';
import {rectSelect} from '../guides';
import {clearSelection, processRectangularSelection} from '../selection';
import {getRaster} from '../layer';
import {ART_BOARD_WIDTH, ART_BOARD_HEIGHT} from '../view';
import {getHitBounds} from '../../helper/bitmap';

/** Tool to handle drag selection. A dotted line box appears and everything enclosed is selected. */
class SelectionBoxTool {
    /**
     * @param {!Modes} mode Current paint editor mode
     * @param {function} setSelectedItems Callback to set the set of selected items in the Redux state
     * @param {function} clearSelectedItems Callback to clear the set of selected items in the Redux state
     */
    constructor (mode, setSelectedItems, clearSelectedItems) {
        this.selectionRect = null;
        this.mode = mode;
        this.setSelectedItems = setSelectedItems;
        this.clearSelectedItems = clearSelectedItems;
    }
    /**
     * @param {boolean} multiselect Whether to multiselect on mouse down (e.g. shift key held)
     */
    onMouseDown (multiselect) {
        if (!multiselect) {
            clearSelection(this.clearSelectedItems);
            this.clearSelectedItems();
        }
    }
    onMouseDrag (event) {
        if (event.event.button > 0) return; // only first mouse button
        if (this.selectionRect) {
            this.selectionRect.remove();
        }
        this.selectionRect = rectSelect(event);
    }
    onMouseUpVector (event) {
        if (event.event.button > 0) return; // only first mouse button
        if (this.selectionRect) {
            processRectangularSelection(event, this.selectionRect, this.mode);
            this.selectionRect.remove();
            this.selectionRect = null;
            this.setSelectedItems();
        }
    }
    onMouseUpBitmap (event) {
        if (event.event.button > 0) return; // only first mouse button
        if (this.selectionRect) {
            let rect = new paper.Rectangle({
                from: new paper.Point(
                    Math.max(0, Math.round(this.selectionRect.bounds.topLeft.x)),
                    Math.max(0, Math.round(this.selectionRect.bounds.topLeft.y))),
                to: new paper.Point(
                    Math.min(ART_BOARD_WIDTH, Math.round(this.selectionRect.bounds.bottomRight.x)),
                    Math.min(ART_BOARD_HEIGHT, Math.round(this.selectionRect.bounds.bottomRight.y)))
            });

            // Trim/tighten selection bounds inwards to only the opaque region, excluding transparent pixels
            rect = getHitBounds(getRaster(), rect);

            if (rect.area) {
                // Pull selected raster to active layer
                const raster = getRaster().getSubRaster(rect);
                raster.parent = paper.project.activeLayer;
                raster.canvas.getContext('2d').imageSmoothingEnabled = false;
                raster.selected = true;
                // Gather a bit of extra data so that we can avoid aliasing at edges
                const expanded = getRaster().getSubRaster(rect.expand(4));
                expanded.remove();
                raster.data = {expanded: expanded};

                // Clear area from raster layer
                const context = getRaster().getContext(true /* modify */);
                context.clearRect(rect.x, rect.y, rect.width, rect.height);
                this.setSelectedItems();
            }

            // Remove dotted rectangle
            this.selectionRect.remove();
            this.selectionRect = null;
        }
    }
}

export default SelectionBoxTool;
