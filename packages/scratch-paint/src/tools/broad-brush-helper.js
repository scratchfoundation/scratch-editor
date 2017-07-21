// Broadbrush based on http://paperjs.org/tutorials/interaction/working-with-mouse-vectors/
const paper = require('paper');

/**
 * Applies segment brush functions to the tool.
 * @param {!Tool} tool paper.js mouse object
 * @param {!options} options brush tool state object
 * @param {!options.brushSize} brush tool diameter
 */
const broadBrushHelper = function (tool, options) {
    let lastPoint;
    let secondLastPoint;
    let finalPath;

    tool.onBroadMouseDown = function (event) {
        tool.minDistance = options.brushSize / 4;
        tool.maxDistance = options.brushSize;
        if (event.event.button > 0) return;  // only first mouse button
        
        finalPath = new paper.Path();
        tool.stylePath(finalPath);
        finalPath.add(event.point);
        lastPoint = secondLastPoint = event.point;
    };
    
    tool.onBroadMouseDrag = function (event) {
        const step = (event.delta).normalize(options.brushSize / 2);

        // Move the first point out away from the drag so that the end of the path is rounded
        if (finalPath.segments && finalPath.segments.length === 1) {
            const removedPoint = finalPath.removeSegment(0).point;
            // Add handles to round the end caps
            const handleVec = step.clone();
            handleVec.length = options.brushSize / 2;
            handleVec.angle += 90;
            finalPath.add(new paper.Segment(removedPoint.subtract(step), -handleVec, handleVec));
        }
        step.angle += 90;
        const top = event.middlePoint.add(step);
        const bottom = event.middlePoint.subtract(step);

        if (finalPath.segments.length > 3) {
            finalPath.removeSegment(finalPath.segments.length - 1);
            finalPath.removeSegment(0);
        }
        finalPath.add(top);
        finalPath.add(event.point.add(step));
        finalPath.insert(0, bottom);
        finalPath.insert(0, event.point.subtract(step));
        if (finalPath.segments.length === 5) {
            // Flatten is necessary to prevent smooth from getting rid of the effect
            // of the handles on the first point.
            finalPath.flatten(options.brushSize / 5);
        }
        finalPath.smooth();
        lastPoint = event.point;
        secondLastPoint = event.lastPoint;
    };

    tool.onBroadMouseUp = function (event) {
        // If the mouse up is at the same point as the mouse drag event then we need
        // the second to last point to get the right direction vector for the end cap
        if (event.point.equals(lastPoint)) {
            lastPoint = secondLastPoint;
        }
        // If the points are still equal, then there was no drag, so just draw a circle.
        if (event.point.equals(lastPoint)) {
            finalPath.remove();
            finalPath = new paper.Path.Circle({
                center: event.point,
                radius: options.brushSize / 2
            });
            tool.stylePath(finalPath);
        } else {
            const step = (event.point.subtract(lastPoint)).normalize(options.brushSize / 2);
            step.angle += 90;
            const handleVec = step.clone();
            handleVec.length = options.brushSize / 2;

            const top = event.point.add(step);
            const bottom = event.point.subtract(step);
            finalPath.add(top);
            finalPath.insert(0, bottom);

            // Simplify before adding end cap so cap doesn't get warped
            finalPath.simplify(1);

            // Add end cap
            step.angle -= 90;
            finalPath.add(new paper.Segment(event.point.add(step), handleVec, -handleVec));
            finalPath.closed = true;
        }

        // Resolve self-crossings
        const newPath =
            finalPath
                .resolveCrossings()
                .reorient(true /* nonZero */, true /* clockwise */)
                .reduce({simplify: true});
        newPath.copyAttributes(finalPath);
        newPath.fillColor = finalPath.fillColor;
        finalPath = newPath;
        return finalPath;
    };
};

module.exports = broadBrushHelper;
