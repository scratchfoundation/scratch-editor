import {isGroup} from '../group';
import {isCompoundPathItem, getRootItem} from '../item';
import {snapDeltaToAngle} from '../math';
import {clearSelection, cloneSelection, getSelectedItems, setItemSelection} from '../selection';

class MoveTool {
    constructor () {
        this.selectedItems = null;
    }

    /**
     * @param {!paper.HitResult} hitResult Data about the location of the mouse click
     * @param {boolean} clone Whether to clone on mouse down (e.g. alt key held)
     * @param {boolean} multiselect Whether to multiselect on mouse down (e.g. shift key held)
     */
    onMouseDown (hitResult, clone, multiselect) {
        const root = getRootItem(hitResult.item);
        const item = isCompoundPathItem(root) || isGroup(root) ? root : hitResult.item;
        if (!item.selected) {
            // deselect all by default if multiselect isn't on
            if (!multiselect) {
                clearSelection();
            }
            setItemSelection(item, true);
        } else if (multiselect) {
            setItemSelection(item, false);
        }
        if (clone) cloneSelection();
        this.selectedItems = getSelectedItems();
    }
    onMouseDrag (event) {
        const dragVector = event.point.subtract(event.downPoint);
        for (const item of this.selectedItems) {
            // add the position of the item before the drag started
            // for later use in the snap calculation
            if (!item.data.origPos) {
                item.data.origPos = item.position;
            }

            if (event.modifiers.shift) {
                item.position = item.data.origPos.add(snapDeltaToAngle(dragVector, Math.PI / 4));
            } else {
                item.position = item.data.origPos.add(dragVector);
            }
        }
    }
    onMouseUp () {
        // resetting the items origin point for the next usage
        for (const item of this.selectedItems) {
            item.data.origPos = null;
        }
        this.selectedItems = null;

        // @todo add back undo
        // pg.undo.snapshot('moveSelection');
    }
}

export default MoveTool;
