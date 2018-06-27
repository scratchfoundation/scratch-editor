import paper from '@scratch/paper';
import {rectSelect} from '../guides';
import {clearSelection, processRectangularSelection} from '../selection';
import {getRaster} from '../layer';

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
        this.selectionRect = rectSelect(event);
        // Remove this rect on the next drag and up event
        this.selectionRect.removeOnDrag();
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
            const rect = new paper.Rectangle(
                Math.round(this.selectionRect.bounds.x),
                Math.round(this.selectionRect.bounds.y),
                Math.round(this.selectionRect.bounds.width),
                Math.round(this.selectionRect.bounds.height),
            );

            // Remove dotted rectangle
            this.selectionRect.remove();
            this.selectionRect = null;

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
        }
    }
}

export default SelectionBoxTool;
