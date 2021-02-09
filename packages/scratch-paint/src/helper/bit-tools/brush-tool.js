import paper from '@scratch/paper';
import {getRaster, getGuideLayer} from '../layer';
import {forEachLinePoint, getBrushMark} from '../bitmap';

/**
 * Tool for drawing with the bitmap brush and eraser
 */
class BrushTool extends paper.Tool {
    /**
     * @param {!function} onUpdateImage A callback to call when the image visibly changes
     * @param {boolean} isEraser True if brush should erase
     */
    constructor (onUpdateImage, isEraser) {
        super();
        this.onUpdateImage = onUpdateImage;
        this.isEraser = isEraser;

        // We have to set these functions instead of just declaring them because
        // paper.js tools hook up the listeners in the setter functions.
        this.onMouseMove = this.handleMouseMove;
        this.onMouseDown = this.handleMouseDown;
        this.onMouseDrag = this.handleMouseDrag;
        this.onMouseUp = this.handleMouseUp;

        this.colorState = null;
        this.active = false;
        this.lastPoint = null;
        this.cursorPreview = null;
    }
    setColor (color) {
        this.color = color;
        this.tmpCanvas = getBrushMark(this.size, this.color, this.isEraser || !this.color);
    }
    setBrushSize (size) {
        // For performance, make sure this is an integer
        this.size = Math.max(1, ~~size);
        this.tmpCanvas = getBrushMark(this.size, this.color, this.isEraser || !this.color);
    }
    // Draw a brush mark at the given point
    draw (x, y) {
        const roundedUpRadius = Math.ceil(this.size / 2);
        const context = getRaster().getContext('2d');
        if (this.isEraser || !this.color) {
            context.globalCompositeOperation = 'destination-out';
        }
        getRaster().drawImage(this.tmpCanvas, new paper.Point(~~x - roundedUpRadius, ~~y - roundedUpRadius));
        if (this.isEraser || !this.color) {
            context.globalCompositeOperation = 'source-over';
        }
    }
    updateCursorIfNeeded () {
        if (!this.size) {
            return;
        }

        // The cursor preview was unattached from the view by an outside process,
        // such as changing costumes or undo.
        if (this.cursorPreview && !this.cursorPreview.parent) {
            this.cursorPreview = null;
        }

        if (!this.cursorPreview || !(this.lastSize === this.size && this.lastColor === this.color)) {
            if (this.cursorPreview) {
                this.cursorPreview.remove();
            }

            this.tmpCanvas = getBrushMark(this.size, this.color, this.isEraser || !this.color);
            this.cursorPreview = new paper.Raster(this.tmpCanvas);
            this.cursorPreview.guide = true;
            this.cursorPreview.parent = getGuideLayer();
            this.cursorPreview.data.isHelperItem = true;
        }

        this.lastSize = this.size;
        this.lastColor = this.color;
    }
    handleMouseMove (event) {
        this.updateCursorIfNeeded();
        this.cursorPreview.position = new paper.Point(~~event.point.x, ~~event.point.y);
    }
    handleMouseDown (event) {
        if (event.event.button > 0) return; // only first mouse button
        this.active = true;

        if (this.cursorPreview) {
            this.cursorPreview.remove();
        }

        this.draw(event.point.x, event.point.y);
        this.lastPoint = event.point;
    }
    handleMouseDrag (event) {
        if (event.event.button > 0 || !this.active) return; // only first mouse button

        forEachLinePoint(this.lastPoint, event.point, this.draw.bind(this));
        this.lastPoint = event.point;
    }
    handleMouseUp (event) {
        if (event.event.button > 0 || !this.active) return; // only first mouse button

        forEachLinePoint(this.lastPoint, event.point, this.draw.bind(this));
        this.onUpdateImage();

        this.lastPoint = null;
        this.active = false;

        this.updateCursorIfNeeded();
        this.cursorPreview.position = new paper.Point(~~event.point.x, ~~event.point.y);
    }
    deactivateTool () {
        this.active = false;
        this.tmpCanvas = null;
        if (this.cursorPreview) {
            this.cursorPreview.remove();
            this.cursorPreview = null;
        }
    }
}

export default BrushTool;
