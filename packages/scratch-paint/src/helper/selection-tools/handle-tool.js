import {clearSelection, getSelectedLeafItems} from '../selection';

/** Sub tool of the Reshape tool for moving handles, which adjust bezier curves. */
class HandleTool {
    /**
     * @param {function} setSelectedItems Callback to set the set of selected items in the Redux state
     * @param {function} clearSelectedItems Callback to clear the set of selected items in the Redux state
     * @param {!function} onUpdateSvg A callback to call when the image visibly changes
     */
    constructor (setSelectedItems, clearSelectedItems, onUpdateSvg) {
        this.hitType = null;
        this.setSelectedItems = setSelectedItems;
        this.clearSelectedItems = clearSelectedItems;
        this.onUpdateSvg = onUpdateSvg;
        this.selectedItems = [];
    }
    /**
     * @param {!object} hitProperties Describes the mouse event
     * @param {?boolean} hitProperties.multiselect Whether to multiselect on mouse down (e.g. shift key held)
     *     select the whole group.
     */
    onMouseDown (hitProperties) {
        if (!hitProperties.multiselect) {
            clearSelection(this.clearSelectedItems);
        }
        
        hitProperties.hitResult.segment.handleIn.selected = true;
        hitProperties.hitResult.segment.handleOut.selected = true;
        this.hitType = hitProperties.hitResult.type;
    }
    onMouseDrag (event) {
        this.selectedItems = getSelectedLeafItems();

        for (const item of this.selectedItems) {
            for (const seg of item.segments) {
                // add the point of the segment before the drag started
                // for later use in the snap calculation
                if (!seg.origPoint) {
                    seg.origPoint = seg.point.clone();
                }

                if (seg.handleOut.selected && this.hitType === 'handle-out'){
                    // if option is pressed or handles have been split,
                    // they're no longer parallel and move independently
                    if (event.modifiers.option ||
                        !seg.handleOut.isColinear(seg.handleIn)) {
                        seg.handleOut = seg.handleOut.add(event.delta);
                    } else {
                        seg.handleOut = seg.handleOut.add(event.delta);
                        seg.handleIn = seg.handleOut.multiply(-seg.handleIn.length / seg.handleOut.length);
                    }
                } else if (seg.handleIn.selected && this.hitType === 'handle-in') {
                    // if option is pressed or handles have been split,
                    // they're no longer parallel and move independently
                    if (event.modifiers.option ||
                        !seg.handleOut.isColinear(seg.handleIn)) {
                        seg.handleIn = seg.handleIn.add(event.delta);

                    } else {
                        seg.handleIn = seg.handleIn.add(event.delta);
                        seg.handleOut = seg.handleIn.multiply(-seg.handleOut.length / seg.handleIn.length);
                    }
                }
            }
        }
    }
    onMouseUp () {
        // resetting the items and segments origin points for the next usage
        let moved = false;
        for (const item of this.selectedItems) {
            if (!item.segments) {
                return;
            }
            for (const seg of item.segments) {
                if (seg.origPoint && !seg.equals(seg.origPoint)) {
                    moved = true;
                }
                seg.origPoint = null;
            }
        }
        if (moved) {
            this.onUpdateSvg();
        }
        this.selectedItems = [];
    }
}

export default HandleTool;
