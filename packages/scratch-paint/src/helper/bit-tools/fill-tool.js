import paper from '@scratch/paper';
import {floodFill, floodFillAll, getHitBounds} from '../bitmap';
import {createGradientObject} from '../style-path';
import {createCanvas, getRaster} from '../layer';
import GradientTypes from '../../lib/gradient-types';

const TRANSPARENT = 'rgba(0,0,0,0)';
/**
 * Tool for drawing fills.
 */
class FillTool extends paper.Tool {
    /**
     * @param {!Function} onUpdateImage A callback to call when the image visibly changes
     */
    constructor (onUpdateImage) {
        super();
        this.onUpdateImage = onUpdateImage;

        // We have to set these functions instead of just declaring them because
        // paper.js tools hook up the listeners in the setter functions.
        this.onMouseDown = this.handleMouseDown;
        this.onMouseDrag = this.handleMouseDrag;

        this.color = null;
        this.color2 = null;
        this.gradientType = null;
        this.active = false;
    }
    setColor (color) {
        this.color = color;
    }
    setColor2 (color2) {
        this.color2 = color2;
    }
    setGradientType (gradientType) {
        this.gradientType = gradientType;
    }
    handleMouseDown (event) {
        this.paint(event);
    }
    handleMouseDrag (event) {
        this.paint(event);
    }
    paint (event) {
        const sourceContext = getRaster().getContext('2d');
        let destContext = sourceContext;
        let color = this.color;
        // Paint to a mask instead of the original canvas when drawing
        if (this.gradientType !== GradientTypes.SOLID) {
            const tmpCanvas = createCanvas();
            destContext = tmpCanvas.getContext('2d');
            color = 'black';
        } else if (!color) {
            // Null color means transparent because that is the standard in vector
            color = TRANSPARENT;
        }
        let changed = false;
        if (event.event.shiftKey) {
            changed = floodFillAll(event.point.x, event.point.y, color, sourceContext, destContext);
        } else {
            changed = floodFill(event.point.x, event.point.y, color, sourceContext, destContext);
        }
        if (changed && this.gradientType !== GradientTypes.SOLID) {
            const raster = new paper.Raster({insert: false});
            raster.canvas = destContext.canvas;
            raster.onLoad = () => {
                raster.position = getRaster().position;
                // Erase what's already there
                getRaster().getContext().globalCompositeOperation = 'destination-out';
                getRaster().drawImage(raster.canvas, new paper.Point());
                getRaster().getContext().globalCompositeOperation = 'source-over';

                // Create the gradient to be masked
                const hitBounds = getHitBounds(raster);
                if (!hitBounds.area) return;
                const gradient = new paper.Shape.Rectangle({
                    insert: false,
                    rectangle: {
                        topLeft: hitBounds.topLeft,
                        bottomRight: hitBounds.bottomRight
                    }
                });
                gradient.fillColor = createGradientObject(
                    this.color,
                    this.color2,
                    this.gradientType,
                    gradient.bounds,
                    event.point);
                const rasterGradient = gradient.rasterize(getRaster().resolution.width, false /* insert */);

                // Mask gradient
                raster.getContext().globalCompositeOperation = 'source-in';
                raster.drawImage(rasterGradient.canvas, rasterGradient.bounds.topLeft);

                // Draw masked gradient into raster layer
                getRaster().drawImage(raster.canvas, new paper.Point());
                this.onUpdateImage();
            };
        } else if (changed) {
            this.onUpdateImage();
        }
    }
    deactivateTool () {
    }
}

export default FillTool;
