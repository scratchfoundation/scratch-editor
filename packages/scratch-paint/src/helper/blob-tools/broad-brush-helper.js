// Broadbrush based on http://paperjs.org/tutorials/interaction/working-with-mouse-vectors/
import paper from '@scratch/paper';
import {stylePath} from '../../helper/style-path';

/**
 * Broad brush functions to add as listeners on the mouse. Call them when the corresponding mouse event happens
 * to get the broad brush behavior.
 *
 * Broad brush draws strokes by drawing points equidistant from the mouse event, perpendicular to the
 * direction of motion. Shortcomings are that this path can cross itself, and 180 degree turns result
 * in a flat edge.
 *
 * @param {!Tool} tool paper.js mouse object
 */
class BroadBrushHelper {
    constructor () {
        this.lastPoint = null;
        this.secondLastPoint = null;
        this.finalPath = null;
    }

    onBroadMouseDown (event, tool, options) {
        tool.minDistance = options.brushSize / 2;
        tool.maxDistance = options.brushSize;
        if (event.event.button > 0) return; // only first mouse button
        
        this.finalPath = new paper.Path();
        stylePath(this.finalPath, options);
        this.finalPath.add(event.point);
        this.lastPoint = this.secondLastPoint = event.point;
    }
    
    onBroadMouseDrag (event, tool, options) {
        const step = (event.delta).normalize(options.brushSize / 2);

        // Move the first point out away from the drag so that the end of the path is rounded
        if (this.finalPath.segments && this.finalPath.segments.length === 1) {
            const removedPoint = this.finalPath.removeSegment(0).point;
            // Add handles to round the end caps
            const handleVec = step.clone();
            handleVec.length = options.brushSize / 2;
            handleVec.angle += 90;
            this.finalPath.add(new paper.Segment(removedPoint.subtract(step), -handleVec, handleVec));
        }
        step.angle += 90;
        const top = event.middlePoint.add(step);
        const bottom = event.middlePoint.subtract(step);

        if (this.finalPath.segments.length > 3) {
            this.finalPath.removeSegment(this.finalPath.segments.length - 1);
            this.finalPath.removeSegment(0);
        }
        this.finalPath.add(top);
        this.finalPath.add(event.point.add(step));
        this.finalPath.insert(0, bottom);
        this.finalPath.insert(0, event.point.subtract(step));
        if (this.finalPath.segments.length === 5) {
            // Flatten is necessary to prevent smooth from getting rid of the effect
            // of the handles on the first point.
            this.finalPath.flatten(Math.min(5, options.brushSize / 5));
        }
        this.finalPath.smooth();
        this.lastPoint = event.point;
        this.secondLastPoint = event.lastPoint;
    }

    onBroadMouseUp (event, tool, options) {
        // If the mouse up is at the same point as the mouse drag event then we need
        // the second to last point to get the right direction vector for the end cap
        if (event.point.equals(this.lastPoint)) {
            this.lastPoint = this.secondLastPoint;
        }
        // If the points are still equal, then there was no drag, so just draw a circle.
        if (event.point.equals(this.lastPoint)) {
            this.finalPath.remove();
            this.finalPath = new paper.Path.Circle({
                center: event.point,
                radius: options.brushSize / 2
            });
            stylePath(this.finalPath, options);
        } else {
            const step = (event.point.subtract(this.lastPoint)).normalize(options.brushSize / 2);
            step.angle += 90;
            const handleVec = step.clone();
            handleVec.length = options.brushSize / 2;

            const top = event.point.add(step);
            const bottom = event.point.subtract(step);
            this.finalPath.add(top);
            this.finalPath.insert(0, bottom);

            // Simplify before adding end cap so cap doesn't get warped
            this.finalPath.simplify(1);

            // Add end cap
            step.angle -= 90;
            this.finalPath.add(new paper.Segment(event.point.add(step), handleVec, -handleVec));
            this.finalPath.closed = true;
        }

        // Resolve self-crossings
        const newPath =
            this.finalPath
                .resolveCrossings()
                .reorient(true /* nonZero */, true /* clockwise */)
                .reduce({simplify: true});
        newPath.copyAttributes(this.finalPath);
        newPath.fillColor = this.finalPath.fillColor;
        this.finalPath = newPath;
        return this.finalPath;
    }
}

export default BroadBrushHelper;
