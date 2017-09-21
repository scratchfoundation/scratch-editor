import {isGroup} from '../group';
import {isCompoundPathItem, getRootItem} from '../item';
import {snapDeltaToAngle} from '../math';
import {clearSelection, cloneSelection, getSelectedItems, setItemSelection} from '../selection';

class MoveTool {
    /**
     * @param {!function} onUpdateSvg A callback to call when the image visibly changes
     */
    constructor (onUpdateSvg) {
        this.selectedItems = null;
        this.onUpdateSvg = onUpdateSvg;
    }

    /**
     * @param {!object} hitProperties Describes the mouse event
     * @param {!paper.HitResult} hitProperties.hitResult Data about the location of the mouse click
     * @param {?boolean} hitProperties.clone Whether to clone on mouse down (e.g. alt key held)
     * @param {?boolean} hitProperties.multiselect Whether to multiselect on mouse down (e.g. shift key held)
     * @param {?boolean} hitProperties.doubleClicked True if this is the second click in a short amout of time
     * @param {?boolean} hitProperties.subselect True if we allow selection of subgroups, false if we should
     *     select the whole group.
     */
    onMouseDown (hitProperties) {
        let item = hitProperties.hitResult.item;
        if (!hitProperties.subselect) {
            const root = getRootItem(hitProperties.hitResult.item);
            item = isCompoundPathItem(root) || isGroup(root) ? root : hitProperties.hitResult.item;
        }
        if (item.selected) {
            // Double click causes all points to be selected in subselect mode.
            if (hitProperties.doubleClicked) {
                if (!hitProperties.multiselect) {
                    clearSelection();
                }
                this._select(item, true /* state */, hitProperties.subselect, true /* fullySelect */);
            } else if (hitProperties.multiselect) {
                this._select(item, false /* state */, hitProperties.subselect);
            }
        } else {
            // deselect all by default if multiselect isn't on
            if (!hitProperties.multiselect) {
                clearSelection();
            }
            this._select(item, true, hitProperties.subselect);
        }
        if (hitProperties.clone) cloneSelection(hitProperties.subselect);
        this.selectedItems = getSelectedItems(true /* subselect */);
    }
    /**
     * Sets the selection state of an item.
     * @param {!paper.Item} item Item to select or deselect
     * @param {?boolean} state True if item should be selected, false if deselected
     * @param {?boolean} subselect True if a subset of all points in an item are allowed to be
     *     selected, false if items must be selected all or nothing.
     * @param {?boolean} fullySelect True if in addition to the item being selected, all of its
     *     control points should be selected. False if the item should be selected but not its
     *     points. Only relevant when subselect is true.
     */
    _select (item, state, subselect, fullySelect) {
        if (subselect) {
            item.selected = false;
            if (fullySelect) {
                item.fullySelected = state;
            } else {
                item.selected = state;
            }
        } else {
            setItemSelection(item, state);
        }
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
        this.onUpdateSvg();
    }
}

export default MoveTool;
