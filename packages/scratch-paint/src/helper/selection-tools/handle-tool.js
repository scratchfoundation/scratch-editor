import {clearSelection, getSelectedItems} from '../selection';

class HandleTool {
    /**
     * @param {!function} onUpdateSvg A callback to call when the image visibly changes
     */
    constructor (onUpdateSvg) {
        this.hitType = null;
        this.onUpdateSvg = onUpdateSvg;
    }
    /**
     * @param {!object} hitProperties Describes the mouse event
     * @param {?boolean} hitProperties.multiselect Whether to multiselect on mouse down (e.g. shift key held)
     *     select the whole group.
     */
    onMouseDown (hitProperties) {
        if (!hitProperties.multiselect) {
            clearSelection();
        }
        
        hitProperties.hitResult.segment.handleIn.selected = true;
        hitProperties.hitResult.segment.handleOut.selected = true;
        this.hitType = hitProperties.hitResult.type;
    }
    onMouseDrag (event) {
        const selectedItems = getSelectedItems(true /* recursive */);
        
        for (const item of selectedItems) {
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
                        const oldLength = seg.handleOut.length;
                        seg.handleOut = seg.handleOut.add(event.delta);
                        seg.handleIn = seg.handleOut.multiply(-seg.handleIn.length / oldLength);
                    }
                } else if (seg.handleIn.selected && this.hitType === 'handle-in') {
                    // if option is pressed or handles have been split,
                    // they're no longer parallel and move independently
                    if (event.modifiers.option ||
                        !seg.handleOut.isColinear(seg.handleIn)) {
                        seg.handleIn = seg.handleIn.add(event.delta);

                    } else {
                        const oldLength = seg.handleIn.length;
                        seg.handleIn = seg.handleIn.add(event.delta);
                        seg.handleOut = seg.handleIn.multiply(-seg.handleOut.length / oldLength);
                    }
                }
            }
        }
    }
    onMouseUp () {
        // @todo add back undo
        this.onUpdateSvg();
    }
}

export default HandleTool;
