// Broadbrush based on http://paperjs.org/tutorials/interaction/working-with-mouse-vectors/
import paper from '@scratch/paper';
import {styleBlob} from '../../helper/style-path';
import log from '../../log/log';
import {getRaster} from '../../helper/layer';

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
        // Direction vector of the last mouse move
        this.lastVec = null;
        // End point of the last mouse move
        this.lastPoint = null;
        // The path of the brush stroke we are building
        this.finalPath = null;
        // Number of points of finalPath that have already been processed
        this.smoothed = 0;
        // Number of steps to wait before performing another amortized smooth
        this.smoothingThreshold = 20;
        // Mouse moves since mouse down
        this.steps = 0;
        // End caps round out corners and are not merged into the path until the end.
        this.endCaps = [];
    }

    onBroadMouseDown (event, tool, options) {
        this.steps = 0;
        this.smoothed = 0;
        tool.minDistance = Math.min(5, Math.max(2 / paper.view.zoom, options.brushSize / 2));
        tool.maxDistance = options.brushSize;
        if (event.event.button > 0) return; // only first mouse button
        
        this.finalPath = new paper.Path.Circle({
            center: event.point,
            radius: options.brushSize / 2
        });
        styleBlob(this.finalPath, options);
        this.lastPoint = event.point;
        getRaster().setPixel(event.point, 'blue');
    }
    
    onBroadMouseDrag (event, tool, options) {
        this.steps++;
        const step = (event.delta).normalize(options.brushSize / 2);

        // Add an end cap if the mouse has changed direction very quickly
        if (this.lastVec) {
            const angle = this.lastVec.getDirectedAngle(step);
            if (Math.abs(angle) > 126) {
                // This will cause us to skip simplifying this sharp angle. Running simplify on
                // sharp angles causes the stroke to blob outwards.
                this.simplify(1);
                this.smoothed++;

                // If the angle is large, the broad brush tends to leave behind a flat edge.
                // This code makes a shape to fill in that flat edge with a rounded cap.
                const circ = new paper.Path.Circle(this.lastPoint, options.brushSize / 2);
                circ.fillColor = options.fillColor;
                const rect = new paper.Path.Rectangle(
                    this.lastPoint.subtract(new paper.Point(-options.brushSize / 2, 0)),
                    this.lastPoint.subtract(new paper.Point(options.brushSize / 2, this.lastVec.length))
                );
                rect.fillColor = options.fillColor;
                rect.rotate(this.lastVec.angle - 90, this.lastPoint);
                const rect2 = new paper.Path.Rectangle(
                    event.point.subtract(new paper.Point(-options.brushSize / 2, 0)),
                    event.point.subtract(new paper.Point(options.brushSize / 2, event.delta.length))
                );
                rect2.fillColor = options.fillColor;
                rect2.rotate(step.angle - 90, event.point);
                this.endCaps.push(this.union(circ, this.union(rect, rect2)));
            }
        }
        this.lastVec = event.delta;
        step.angle += 90;

        // Move the first point out away from the drag so that the end of the path is rounded
        if (this.steps === 1) {
            // Replace circle with path
            this.finalPath.remove();
            this.finalPath = new paper.Path();
            const handleVec = event.delta.normalize(options.brushSize / 2);
            this.finalPath.add(new paper.Segment(
                this.lastPoint.subtract(handleVec),
                handleVec.rotate(-90),
                handleVec.rotate(90)
            ));
            styleBlob(this.finalPath, options);
            this.finalPath.insert(0, new paper.Segment(this.lastPoint.subtract(step)));
            this.finalPath.add(new paper.Segment(this.lastPoint.add(step)));
        }
        const top = event.middlePoint.add(step);
        const bottom = event.middlePoint.subtract(step);

        this.finalPath.add(top);
        this.finalPath.add(event.point.add(step));
        this.finalPath.insert(0, bottom);
        this.finalPath.insert(0, event.point.subtract(step));

        if (this.finalPath.segments.length > this.smoothed + (this.smoothingThreshold * 2)) {
            this.simplify(1);
        }
        this.lastPoint = event.point;
    }

    /**
     * Simplify the path so that it looks almost the same while trying to have a reasonable number of handles.
     * Without this, there would be 2 handles for every mouse move, which would make the path produced basically
     * uneditable. This version of simplify keeps track of how much of the path has already been simplified to
     * avoid repeating work.
     * @param {number} threshold The simplify algorithm must try to stay within this distance of the actual line.
     *     The algorithm will be faster and able to remove more points the higher this number is.
     *     Note that 1 is about the lowest this algorithm can do (the result is about the same when 1 is
     *     passed in as when 0 is passed in)
     */
    simplify (threshold) {
        // Length of the current path
        const length = this.finalPath.segments.length;
        // Number of new points added to front and end of path since last simplify
        const newPoints = Math.floor((length - this.smoothed) / 2) + 1;

        // Where to cut. Don't go past the rounded start of the line (so there's always a tempPathMid)
        const firstCutoff = Math.min(newPoints + 1, Math.floor((length / 2)));
        const lastCutoff = Math.max(length - 1 - newPoints, Math.floor(length / 2) + 1);
        if (firstCutoff <= 1 || lastCutoff >= length - 1) {
            // Entire path is simplified already
            return;
        }
        // Cut the path into 3 segments: the 2 ends where the new points are, and the middle, which will be
        // staying the same
        const tempPath1 = new paper.Path(this.finalPath.segments.slice(1, firstCutoff));
        const tempPathMid = new paper.Path(this.finalPath.segments.slice(firstCutoff, lastCutoff));
        const tempPath2 = new paper.Path(this.finalPath.segments.slice(lastCutoff, length - 1));

        // Run simplify on the new ends. We need to graft the old handles back onto the newly
        // simplified paths, since simplify removes the in handle from the start of the path, and
        // the out handle from the end of the path it's simplifying.
        const oldPath1End = tempPath1.segments[tempPath1.segments.length - 1];
        const oldPath2End = tempPath2.segments[0];
        tempPath1.simplify(threshold);
        tempPath2.simplify(threshold);
        const newPath1End = tempPath1.segments[tempPath1.segments.length - 1];
        const newPath2End = tempPath2.segments[0];
        newPath1End.handleOut = oldPath1End.handleOut;
        newPath2End.handleIn = oldPath2End.handleIn;

        // Delete the old contents of finalPath and replace it with the newly simplified segments, concatenated
        this.finalPath.removeSegments(1, this.finalPath.segments.length - 1);
        this.finalPath.insertSegments(1, tempPath1.segments.concat(tempPathMid.segments).concat(tempPath2.segments));

        // Remove temp paths
        tempPath1.remove();
        tempPath2.remove();
        tempPathMid.remove();

        // Update how many points have been smoothed so far so that we don't redo work when
        // simplify is called next time.
        this.smoothed = Math.max(2, this.finalPath.segments.length);
    }

    /**
     * Like paper.Path.unite, but it removes the original 2 paths
     * @param {paper.Path} path1 to merge
     * @param {paper.Path} path2 to merge
     * @return {paper.Path} merged path. Original paths 1 and 2 will be removed from the view.
     */
    union (path1, path2) {
        const temp = path1.unite(path2);
        path1.remove();
        path2.remove();
        return temp;
    }

    onBroadMouseUp (event, tool, options) {
        // If there was only a single click, draw a circle.
        if (this.steps === 0) {
            this.endCaps.length = 0;
            return this.finalPath;
        }

        // If the mouse up is at the same point as the mouse drag event then we need
        // the second to last point to get the right direction vector for the end cap
        if (!event.point.equals(this.lastPoint)) {
            const step = event.delta.normalize(options.brushSize / 2);
            step.angle += 90;

            const top = event.point.add(step);
            const bottom = event.point.subtract(step);
            this.finalPath.add(top);
            this.finalPath.insert(0, bottom);
        }

        // Simplify before adding end cap so cap doesn't get warped
        this.simplify(1);
        const handleVec = event.delta.normalize(options.brushSize / 2);
        this.finalPath.add(new paper.Segment(
            event.point.add(handleVec),
            handleVec.rotate(90),
            handleVec.rotate(-90)
        ));
        this.finalPath.closePath();

        // Resolve self-crossings
        const newPath =
            this.finalPath
                .resolveCrossings()
                .reorient(true /* nonZero */, true /* clockwise */)
                .reduce({simplify: true});
        if (newPath !== this.finalPath) {
            newPath.copyAttributes(this.finalPath);
            newPath.fillColor = this.finalPath.fillColor;
            this.finalPath.remove();
            this.finalPath = newPath;
        }
        
        // Try to merge end caps
        for (const cap of this.endCaps) {
            const temp = this.union(this.finalPath, cap);
            if (temp.area >= this.finalPath.area &&
                !(temp instanceof paper.CompoundPath && !(this.finalPath instanceof paper.CompoundPath))) {
                this.finalPath = temp;
            } else {
                // If the union of the two shapes is smaller than the original shape,
                // or it caused the path to become a compound path,
                // then there must have been a glitch with paperjs's unite function.
                // In this case, skip merging that segment. It's not great, but it's
                // better than losing the whole path for instance. (Unfortunately, this
                // happens reasonably often to scribbles, and this code doesn't catch
                // all of the failures.)
                this.finalPath.insertAbove(temp);
                temp.remove();
                log.warn('Skipping a merge.');
            }
        }
        this.endCaps.length = 0;

        return this.finalPath;
    }
}

export default BroadBrushHelper;
