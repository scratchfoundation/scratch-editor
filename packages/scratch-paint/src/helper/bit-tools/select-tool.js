import paper from '@scratch/paper';
import Modes from '../../lib/modes';

import {createCanvas, getRaster} from '../layer';
import {fillRect, scaleBitmap} from '../bitmap';

import BoundingBoxTool from '../selection-tools/bounding-box-tool';
import NudgeTool from '../selection-tools/nudge-tool';
import SelectionBoxTool from '../selection-tools/selection-box-tool';

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
        if (this.selection && this.selection.parent && !this.selection.selected) {
            // Selection got deselected
            this.commitSelection();
        }
        if ((!this.selection || !this.selection.parent) &&
                selectedItems && selectedItems.length === 1 && selectedItems[0] instanceof paper.Raster) {
            // Track the new active selection. This may happen via undo or paste.
            this.selection = selectedItems[0];
        }
    }
    /**
     * Returns the hit options to use when conducting hit tests.
     * @return {object} See paper.Item.hitTest for definition of options
     */
    getHitOptions () {
        // Tolerance needs to be scaled when the view is zoomed in in order to represent the same
        // distance for the user to move the mouse.
        return {
            segments: true,
            stroke: true,
            curves: true,
            fill: true,
            guide: false,
            tolerance: SelectTool.TOLERANCE / paper.view.zoom
        };
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
                this.getHitOptions())) {
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
        if (!this.selection || !this.selection.parent) return;

        this.maybeApplyScaleToCanvas(this.selection);
        this.commitArbitraryTransformation(this.selection);
        this.onUpdateImage();
    }
    maybeApplyScaleToCanvas (item) {
        if (!item.matrix.isInvertible()) {
            item.remove();
            return;
        }

        // context.drawImage will anti-alias the image if both width and height are reduced.
        // However, it will preserve pixel colors if only one or the other is reduced, and
        // imageSmoothingEnabled is set to false. Therefore, we can avoid aliasing by scaling
        // down images in a 2 step process.
        const decomposed = item.matrix.decompose(); // Decomposition order: translate, rotate, scale, skew
        if (Math.abs(decomposed.scaling.x) < 1 && Math.abs(decomposed.scaling.y) < 1 &&
                decomposed.scaling.x !== 0 && decomposed.scaling.y !== 0) {
            item.canvas = scaleBitmap(item.canvas, decomposed.scaling);
            item.data.expanded.canvas = scaleBitmap(item.data.expanded.canvas, decomposed.scaling);
            // Remove the scale from the item's matrix
            item.matrix.append(
                new paper.Matrix().scale(new paper.Point(1 / decomposed.scaling.x, 1 / decomposed.scaling.y)));
        }
    }
    commitArbitraryTransformation (item) {
        // Create a canvas to perform masking
        const tmpCanvas = createCanvas();
        const context = tmpCanvas.getContext('2d');
        // Draw mask
        const rect = new paper.Shape.Rectangle(new paper.Point(), item.size);
        rect.matrix = item.matrix;
        fillRect(rect, context);
        rect.remove();
        context.globalCompositeOperation = 'source-in';

        // Draw image onto mask
        const m = item.matrix;
        context.transform(m.a, m.b, m.c, m.d, m.tx, m.ty);
        context.transform(1, 0, 0, 1, -item.data.expanded.canvas.width / 2, -item.data.expanded.canvas.height / 2);
        context.drawImage(item.data.expanded.canvas, 0, 0);

        // Draw temp canvas onto raster layer
        getRaster().drawImage(tmpCanvas, new paper.Point());
        item.remove();
        this.selection = null;
    }
    deactivateTool () {
        this.commitSelection();
        this.boundingBoxTool.removeBoundsPath();
        this.boundingBoxTool = null;
        this.selectionBoxTool = null;
    }
}

export default SelectTool;
