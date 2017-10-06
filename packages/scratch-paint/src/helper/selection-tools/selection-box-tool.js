import {rectSelect} from '../guides';
import {clearSelection, processRectangularSelection} from '../selection';

/** Tool to handle drag selection. A dotted line box appears and everything enclosed is selected. */
class SelectionBoxTool {
    constructor (mode) {
        this.selectionRect = null;
        this.mode = mode;
    }
    /**
     * @param {boolean} multiselect Whether to multiselect on mouse down (e.g. shift key held)
     */
    onMouseDown (multiselect) {
        if (!multiselect) {
            clearSelection();
        }
    }
    onMouseDrag (event) {
        this.selectionRect = rectSelect(event);
        // Remove this rect on the next drag and up event
        this.selectionRect.removeOnDrag();
    }
    onMouseUp (event) {
        if (this.selectionRect) {
            processRectangularSelection(event, this.selectionRect, this.mode);
            this.selectionRect.remove();
            this.selectionRect = null;
        }
    }
}

export default SelectionBoxTool;
