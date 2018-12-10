import paper from '@scratch/paper';
import Modes from '../../lib/modes';
import {commitRectToBitmap} from '../bitmap';
import {getRaster} from '../layer';
import {clearSelection} from '../selection';
import {getSquareDimensions} from '../math';
import BoundingBoxTool from '../selection-tools/bounding-box-tool';
import NudgeTool from '../selection-tools/nudge-tool';

/**
 * Tool for drawing rects.
 */
class RectTool extends paper.Tool {
    static get TOLERANCE () {
        return 2;
    }
    /**
     * @param {function} setSelectedItems Callback to set the set of selected items in the Redux state
     * @param {function} clearSelectedItems Callback to clear the set of selected items in the Redux state
     * @param {function} setCursor Callback to set the visible mouse cursor
     * @param {!function} onUpdateImage A callback to call when the image visibly changes
     */
    constructor (setSelectedItems, clearSelectedItems, setCursor, onUpdateImage) {
        super();
        this.setSelectedItems = setSelectedItems;
        this.clearSelectedItems = clearSelectedItems;
        this.onUpdateImage = onUpdateImage;
        this.boundingBoxTool = new BoundingBoxTool(
            Modes.BIT_RECT,
            setSelectedItems,
            clearSelectedItems,
            setCursor,
            onUpdateImage
        );
        const nudgeTool = new NudgeTool(this.boundingBoxTool, onUpdateImage);

        // We have to set these functions instead of just declaring them because
        // paper.js tools hook up the listeners in the setter functions.
        this.onMouseDown = this.handleMouseDown;
        this.onMouseDrag = this.handleMouseDrag;
        this.onMouseMove = this.handleMouseMove;
        this.onMouseUp = this.handleMouseUp;
        this.onKeyUp = nudgeTool.onKeyUp;
        this.onKeyDown = nudgeTool.onKeyDown;

        this.rect = null;
        this.color = null;
        this.active = false;
    }
    getHitOptions () {
        return {
            segments: false,
            stroke: true,
            curves: false,
            fill: true,
            guide: false,
            match: hitResult =>
                (hitResult.item.data && (hitResult.item.data.isScaleHandle || hitResult.item.data.isRotHandle)) ||
                hitResult.item.selected, // Allow hits on bounding box and selected only
            tolerance: RectTool.TOLERANCE / paper.view.zoom
        };
    }
    /**
     * Should be called if the selection changes to update the bounds of the bounding box.
     * @param {Array<paper.Item>} selectedItems Array of selected items.
     */
    onSelectionChanged (selectedItems) {
        this.boundingBoxTool.onSelectionChanged(selectedItems);
        if ((!this.rect || !this.rect.isInserted()) &&
                selectedItems && selectedItems.length === 1 && selectedItems[0].shape === 'rectangle') {
            // Infer that an undo occurred and get back the active rect
            this.rect = selectedItems[0];
            if (this.rect.data.zoomLevel !== paper.view.zoom) {
                this.rect.strokeWidth = this.rect.strokeWidth / this.rect.data.zoomLevel * paper.view.zoom;
                this.rect.data.zoomLevel = paper.view.zoom;
                this.thickness = this.rect.strokeWidth;
            }
            this.filled = this.rect.strokeWidth === 0;
            this.color = this.filled ? this.rect.fillColor.toCSS() : this.rect.strokeColor.toCSS();
        } else if (this.rect && this.rect.isInserted() && !this.rect.selected) {
            // Rectangle got deselected
            this.commitRect();
        }
    }
    setColor (color) {
        this.color = color;
        if (this.rect) {
            if (this.filled) {
                this.rect.fillColor = this.color;
            } else {
                this.rect.strokeColor = this.color;
            }
        }
    }
    setFilled (filled) {
        if (this.filled === filled) return;
        this.filled = filled;
        if (this.rect && this.rect.isInserted()) {
            if (this.filled) {
                this.rect.fillColor = this.color;
                this.rect.strokeWidth = 0;
                this.rect.strokeColor = null;
            } else {
                this.rect.fillColor = null;
                this.rect.strokeWidth = this.thickness;
                this.rect.strokeColor = this.color;
            }
            this.onUpdateImage();
        }
    }
    setThickness (thickness) {
        if (this.thickness === thickness * paper.view.zoom) return;
        this.thickness = thickness * paper.view.zoom;
        if (this.rect && this.rect.isInserted() && !this.filled) {
            this.rect.strokeWidth = this.thickness;
        }
        if (this.rect && this.rect.isInserted()) {
            this.rect.data.zoomLevel = paper.view.zoom;
            this.onUpdateImage();
        }
    }
    handleMouseDown (event) {
        if (event.event.button > 0) return; // only first mouse button
        this.active = true;

        if (this.boundingBoxTool.onMouseDown(
            event, false /* clone */, false /* multiselect */, false /* doubleClicked */, this.getHitOptions())) {
            this.isBoundingBoxMode = true;
        } else {
            this.isBoundingBoxMode = false;
            clearSelection(this.clearSelectedItems);
            this.commitRect();
        }
    }
    handleMouseDrag (event) {
        if (event.event.button > 0 || !this.active) return; // only first mouse button

        if (this.isBoundingBoxMode) {
            this.boundingBoxTool.onMouseDrag(event);
            return;
        }

        const dimensions = event.point.subtract(event.downPoint);
        const baseRect = new paper.Rectangle(event.downPoint, event.point);
        const squareDimensions = getSquareDimensions(event.downPoint, event.point);
        if (event.modifiers.shift) {
            baseRect.size = squareDimensions.size.abs();
        }

        if (this.rect) this.rect.remove();
        this.rect = new paper.Shape.Rectangle(baseRect);
        if (this.filled) {
            this.rect.fillColor = this.color;
            this.rect.strokeWidth = 0;
        } else {
            this.rect.strokeColor = this.color;
            this.rect.strokeWidth = this.thickness;
        }
        this.rect.strokeJoin = 'round';
        this.rect.strokeScaling = false;
        this.rect.data = {zoomLevel: paper.view.zoom};

        if (event.modifiers.alt) {
            this.rect.position = event.downPoint;
        } else if (event.modifiers.shift) {
            this.rect.position = squareDimensions.position;
        } else {
            this.rect.position = event.downPoint.add(dimensions.multiply(.5));
        }
    }
    handleMouseMove (event) {
        this.boundingBoxTool.onMouseMove(event, this.getHitOptions());
    }
    handleMouseUp (event) {
        if (event.event.button > 0 || !this.active) return; // only first mouse button

        if (this.isBoundingBoxMode) {
            this.boundingBoxTool.onMouseUp(event);
            this.isBoundingBoxMode = null;
            return;
        }

        if (this.rect) {
            if (Math.abs(this.rect.size.width * this.rect.size.height) < RectTool.TOLERANCE / paper.view.zoom) {
                // Tiny shape created unintentionally?
                this.rect.remove();
                this.rect = null;
            } else {
                // Hit testing does not work correctly unless the width and height are positive
                this.rect.size = new paper.Point(Math.abs(this.rect.size.width), Math.abs(this.rect.size.height));
                this.rect.selected = true;
                this.setSelectedItems();
            }
        }
        this.active = false;
        this.onUpdateImage();
    }
    commitRect () {
        if (!this.rect || !this.rect.isInserted()) return;

        commitRectToBitmap(this.rect, getRaster());

        this.rect.remove();
        this.rect = null;
    }
    deactivateTool () {
        this.commitRect();
        this.boundingBoxTool.deactivateTool();
    }
}

export default RectTool;
