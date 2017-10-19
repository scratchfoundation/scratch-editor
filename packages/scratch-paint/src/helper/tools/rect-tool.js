import paper from '@scratch/paper';
import log from '../../log/log';

/**
 * Tool for drawing rectangles.
 */
class RectTool extends paper.Tool {
    /**
     * @param {function} setSelectedItems Callback to set the set of selected items in the Redux state
     * @param {function} clearSelectedItems Callback to clear the set of selected items in the Redux state
     * @param {!function} onUpdateSvg A callback to call when the image visibly changes
     */
    constructor (setSelectedItems, clearSelectedItems, onUpdateSvg) {
        super();
        this.setSelectedItems = setSelectedItems;
        this.clearSelectedItems = clearSelectedItems;
        this.onUpdateSvg = onUpdateSvg;
        this.prevHoveredItemId = null;
        
        // We have to set these functions instead of just declaring them because
        // paper.js tools hook up the listeners in the setter functions.
        this.onMouseDown = this.handleMouseDown;
        this.onMouseMove = this.handleMouseMove;
        this.onMouseDrag = this.handleMouseDrag;
        this.onMouseUp = this.handleMouseUp;
    }
    handleMouseDown () {
        log.warn('Rectangle tool not yet implemented');
    }
    handleMouseMove () {
    }
    handleMouseDrag () {
    }
    handleMouseUp () {
    }
    deactivateTool () {
    }
}

export default RectTool;
