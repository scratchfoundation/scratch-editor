import Modes from '../../lib/modes';

import {getSelectedLeafItems} from '../selection';
import {getRaster} from '../layer';

import BoundingBoxTool from '../selection-tools/bounding-box-tool';
import NudgeTool from '../selection-tools/nudge-tool';
import SelectionBoxTool from '../selection-tools/selection-box-tool';
import paper from '@scratch/paper';

/**
 * paper.Tool that handles select mode in bitmap. This is made up of 2 subtools.
 * - The selection box tool is active when the user clicks an empty space and drags.
 *   It selects all items in the rectangle.
 * - The bounding box tool is active if the user clicks on a non-empty space. It handles
 *   reshaping the selection.
 */
class SelectTool extends paper.Tool {
    /** The distance within which mouse events count as a hit against an item */
    static get TOLERANCE () {
        return 6;
    }
    /**
     * @param {function} setSelectedItems Callback to set the set of selected items in the Redux state
     * @param {function} clearSelectedItems Callback to clear the set of selected items in the Redux state
     * @param {!function} onUpdateImage A callback to call when the image visibly changes
     */
    constructor (setSelectedItems, clearSelectedItems, onUpdateImage) {
        super();
        this.onUpdateImage = onUpdateImage;
        this.boundingBoxTool = new BoundingBoxTool(Modes.SELECT, setSelectedItems, clearSelectedItems, onUpdateImage);
        const nudgeTool = new NudgeTool(this.boundingBoxTool, onUpdateImage);
        this.selectionBoxTool = new SelectionBoxTool(Modes.SELECT, setSelectedItems, clearSelectedItems);
        this.selectionBoxMode = false;
        this.selection = null;
        this.active = false;

        // We have to set these functions instead of just declaring them because
        // paper.js tools hook up the listeners in the setter functions.
        this.onMouseDown = this.handleMouseDown;
        this.onMouseDrag = this.handleMouseDrag;
        this.onMouseUp = this.handleMouseUp;
        this.onKeyUp = nudgeTool.onKeyUp;
        this.onKeyDown = nudgeTool.onKeyDown;

        this.boundingBoxTool.setSelectionBounds();
    }
    /**
     * Should be called if the selection changes to update the bounds of the bounding box.
     * @param {Array<paper.Item>} selectedItems Array of selected items.
     */
    onSelectionChanged (selectedItems) {
        this.boundingBoxTool.onSelectionChanged(selectedItems);
    }
    /**
     * Returns the hit options to use when conducting hit tests.
     * @param {boolean} preselectedOnly True if we should only return results that are already
     *     selected.
     * @return {object} See paper.Item.hitTest for definition of options
     */
    getHitOptions (preselectedOnly) {
        // Tolerance needs to be scaled when the view is zoomed in in order to represent the same
        // distance for the user to move the mouse.
        const hitOptions = {
            segments: true,
            stroke: true,
            curves: true,
            fill: true,
            guide: false,
            tolerance: SelectTool.TOLERANCE / paper.view.zoom
        };
        if (preselectedOnly) {
            hitOptions.selected = true;
        }
        return hitOptions;
    }
    handleMouseDown (event) {
        if (event.event.button > 0) return; // only first mouse button
        this.active = true;

        // If bounding box tool does not find an item that was hit, rasterize the old selection,
        // then use selection box tool.
        if (!this.boundingBoxTool
            .onMouseDown(
                event,
                event.modifiers.alt,
                event.modifiers.shift,
                this.getHitOptions(false /* preseelectedOnly */))) {
            this.commitSelection();
            this.selectionBoxMode = true;
            this.selectionBoxTool.onMouseDown(event.modifiers.shift);
        }
    }
    handleMouseDrag (event) {
        if (event.event.button > 0 || !this.active) return; // only first mouse button

        if (this.selectionBoxMode) {
            this.selectionBoxTool.onMouseDrag(event);
        } else {
            this.boundingBoxTool.onMouseDrag(event);
        }
    }
    handleMouseUp (event) {
        if (event.event.button > 0 || !this.active) return; // only first mouse button

        if (this.selectionBoxMode) {
            this.selectionBoxTool.onMouseUpBitmap(event);
        } else {
            this.boundingBoxTool.onMouseUp(event);
        }
        this.selectionBoxMode = false;
        this.active = false;
    }
    commitSelection () {
        const selection = getSelectedLeafItems();
        if (selection.length) {
            // @todo handle non-rasters?
            for (const item of selection) {
                if (item instanceof paper.Raster) {
                    // TODO image smoothing?
                    getRaster().canvas.drawImage(
                        item.canvas,
                        item.bounds.topLeft.x,
                        item.bounds.topLeft.y,
                        // Apply transform
                    );
                    item.remove();
                }
            }
        }
    }
    deactivateTool () {
        this.commitSelection();
        this.boundingBoxTool.removeBoundsPath();
        this.boundingBoxTool = null;
        this.selectionBoxTool = null;
    }
}

export default SelectTool;
