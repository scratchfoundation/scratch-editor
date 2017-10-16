import paper from '@scratch/paper';
import {stylePath} from '../../helper/style-path';

/**
 * Segment brush functions to add as listeners on the mouse. Call them when the corresponding mouse event happens
 * to get the broad brush behavior.
 *
 * Segment brush draws by creating a rounded rectangle for each mouse move event and merging all of
 * those shapes. Unlike the broad brush, the resulting shape will not self-intersect and when you make
 * 180 degree turns, you will get a rounded point as expected. Shortcomings include that performance is
 * worse, especially as the number of segments to join increase, and that there are problems in paper.js
 * with union on shapes with curves, so that chunks of the union tend to disappear.
 * (https://github.com/paperjs/paper.js/issues/1321)
 *
 * @param {!Tool} tool paper.js mouse object
 */
class SegmentBrushHelper {
    constructor () {
        this.lastPoint = null;
        this.finalPath = null;
        this.firstCircle = null;
    }

    onSegmentMouseDown (event, tool, options) {
        if (event.event.button > 0) return; // only first mouse button

        tool.minDistance = 1;
        tool.maxDistance = options.brushSize;
        
        this.firstCircle = new paper.Path.Circle({
            center: event.point,
            radius: options.brushSize / 2
        });
        this.finalPath = this.firstCircle;
        stylePath(this.finalPath, options);
        this.lastPoint = event.point;
    }
    
    onSegmentMouseDrag (event, tool, options) {
        if (event.event.button > 0) return; // only first mouse button

        const step = (event.delta).normalize(options.brushSize / 2);
        const handleVec = step.clone();
        handleVec.length = options.brushSize / 2;
        handleVec.angle += 90;

        const path = new paper.Path();
        
        stylePath(path, options);

        // Add handles to round the end caps
        path.add(new paper.Segment(this.lastPoint.subtract(step), handleVec.multiply(-1), handleVec));
        step.angle += 90;

        path.add(event.lastPoint.add(step));
        path.insert(0, event.lastPoint.subtract(step));
        path.add(event.point.add(step));
        path.insert(0, event.point.subtract(step));

        // Add end cap
        step.angle -= 90;
        path.add(new paper.Segment(event.point.add(step), handleVec, handleVec.multiply(-1)));
        path.closed = true;
        // The unite function on curved paths does not always work (sometimes deletes half the path)
        // so we have to flatten.
        path.flatten(Math.min(5, options.brushSize / 5));
        
        this.lastPoint = event.point;
        const newPath = this.finalPath.unite(path);
        path.remove();
        this.finalPath.remove();
        this.finalPath = newPath;
    }

    onSegmentMouseUp (event) {
        if (event.event.button > 0) return; // only first mouse button

        // TODO: This smoothing tends to cut off large portions of the path! Would like to eventually
        // add back smoothing, maybe a custom implementation that only applies to a subset of the line?

        // Smooth the path. Make it unclosed first because smoothing of closed
        // paths tends to cut off the path.
        if (this.finalPath.segments && this.finalPath.segments.length > 4) {
            this.finalPath.closed = false;
            this.finalPath.simplify(2);
            this.finalPath.closed = true;
            // Merge again with the first point, since it gets distorted when we unclose the path.
            const temp = this.finalPath.unite(this.firstCircle);
            this.finalPath.remove();
            this.finalPath = temp;
        }
        return this.finalPath;
    }
}

export default SegmentBrushHelper;
