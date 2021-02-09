import paper from '@scratch/paper';
import {getRaster, createCanvas, getGuideLayer} from '../layer';
import {forEachLinePoint, getBrushMark} from '../bitmap';
import {ART_BOARD_WIDTH, ART_BOARD_HEIGHT} from '../view';

/**
 * Tool for drawing lines with the bitmap brush.
 */
class LineTool extends paper.Tool {
    /**
     * @param {!function} onUpdateImage A callback to call when the image visibly changes
     */
    constructor (onUpdateImage) {
        super();
        this.onUpdateImage = onUpdateImage;
        
        // We have to set these functions instead of just declaring them because
        // paper.js tools hook up the listeners in the setter functions.
        this.onMouseMove = this.handleMouseMove;
        this.onMouseDown = this.handleMouseDown;
        this.onMouseDrag = this.handleMouseDrag;
        this.onMouseUp = this.handleMouseUp;

        this.colorState = null;
        this.active = false;
        this.startPoint = null;
        this.cursorPreview = null;
        // Raster to which to draw
        this.drawTarget = null;
    }
    setColor (color) {
        this.color = color;
        this.tmpCanvas = getBrushMark(this.size, this.color);
    }
    setLineSize (size) {
        // For performance, make sure this is an integer
        this.size = Math.max(1, ~~size);
        this.tmpCanvas = getBrushMark(this.size, this.color);
    }
    // Draw a brush mark at the given point
    draw (x, y) {
        const roundedUpRadius = Math.ceil(this.size / 2);
        this.drawTarget.drawImage(this.tmpCanvas, new paper.Point(~~x - roundedUpRadius, ~~y - roundedUpRadius));
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

            this.tmpCanvas = getBrushMark(this.size, this.color);
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

        if (this.cursorPreview) this.cursorPreview.remove();

        const tmpCanvas = createCanvas();
        this.drawTarget = new paper.Raster(tmpCanvas);
        this.drawTarget.parent = getGuideLayer();
        this.drawTarget.guide = true;
        this.drawTarget.locked = true;
        this.drawTarget.position = getRaster().position;

        this.draw(event.point.x, event.point.y);
        this.startPoint = event.point;
    }
    handleMouseDrag (event) {
        if (event.event.button > 0 || !this.active) return; // only first mouse button

        // Clear
        const context = this.drawTarget.canvas.getContext('2d');
        context.clearRect(0, 0, ART_BOARD_WIDTH, ART_BOARD_HEIGHT);

        forEachLinePoint(this.startPoint, event.point, this.draw.bind(this));
    }
    handleMouseUp (event) {
        if (event.event.button > 0 || !this.active) return; // only first mouse button
        
        this.drawTarget.remove();
        this.drawTarget = getRaster();
        forEachLinePoint(this.startPoint, event.point, this.draw.bind(this));
        this.drawTarget = null;
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

export default LineTool;
