import paper from '@scratch/paper';
import Modes from '../../lib/modes';
import {fillRect, outlineRect} from '../bitmap';
import {createCanvas, getRaster} from '../layer';
import {clearSelection} from '../selection';
import BoundingBoxTool from '../selection-tools/bounding-box-tool';
import NudgeTool from '../selection-tools/nudge-tool';

/**
 * Tool for drawing rects.
 */
class RectTool extends paper.Tool {
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
        this.setSelectedItems = setSelectedItems;
        this.clearSelectedItems = clearSelectedItems;
        this.onUpdateImage = onUpdateImage;
        this.boundingBoxTool = new BoundingBoxTool(Modes.BIT_RECT, setSelectedItems, clearSelectedItems, onUpdateImage);
        const nudgeTool = new NudgeTool(this.boundingBoxTool, onUpdateImage);

        // We have to set these functions instead of just declaring them because
        // paper.js tools hook up the listeners in the setter functions.
        this.onMouseDown = this.handleMouseDown;
        this.onMouseDrag = this.handleMouseDrag;
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
                (hitResult.item.data && hitResult.item.data.isHelperItem) ||
                    hitResult.item === this.rect, // Allow hits on bounding box and rect only
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
            }
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
        this.filled = filled;
        if (this.rect) {
            if (this.filled) {
                this.rect.fillColor = this.color;
                this.rect.strokeWidh = 0;
                this.rect.strokeColor = null;
            } else {
                this.rect.fillColor = null;
                this.rect.strokeWidth = this.thickness;
                this.rect.strokeColor = this.color;
            }
        }
    }
    setThickness (thickness) {
        this.thickness = thickness * paper.view.zoom;
        if (this.rect && !this.filled) {
            this.rect.strokeWidth = this.thickness;
        }
        if (this.rect) this.rect.data.zoomLevel = paper.view.zoom;
    }
    handleMouseDown (event) {
        if (event.event.button > 0) return; // only first mouse button
        this.active = true;

        if (this.boundingBoxTool.onMouseDown(event, false /* clone */, false /* multiselect */, this.getHitOptions())) {
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
        if (event.modifiers.shift) {
            baseRect.height = baseRect.width;
            dimensions.y = event.downPoint.y > event.point.y ? -Math.abs(baseRect.width) : Math.abs(baseRect.width);
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
        } else {
            this.rect.position = event.downPoint.add(dimensions.multiply(.5));
        }
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
    }
    commitRect () {
        if (!this.rect || !this.rect.isInserted()) return;

        const tmpCanvas = createCanvas();
        const context = tmpCanvas.getContext('2d');
        context.fillStyle = this.color;
        if (this.filled) {
            fillRect(this.rect, context);
        } else {
            outlineRect(this.rect, this.thickness / paper.view.zoom, context);
        }
        getRaster().drawImage(tmpCanvas, new paper.Point());

        this.rect.remove();
        this.rect = null;
        this.onUpdateImage();
    }
    deactivateTool () {
        this.commitRect();
        this.boundingBoxTool.removeBoundsPath();
    }
}

export default RectTool;
