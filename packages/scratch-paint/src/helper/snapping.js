import paper from '@scratch/paper';

/**
 * @param {paper.Point} point1 point 1
 * @param {paper.Point} point2 point 2
 * @param {number} tolerance Distance allowed between points that are "touching"
 * @return {boolean} true if points are within the tolerance distance.
 */
const touching = function (point1, point2, tolerance) {
    return point1.getDistance(point2, true) < Math.pow(tolerance / paper.view.zoom, 2);
};

/**
 * @param {!paper.Point} point Point to check line endpoint hits against
 * @param {!number} tolerance Distance within which it counts as a hit
 * @param {?paper.Path} excludePath Path to exclude from hit test, if any. For instance, you
 *     are drawing a line and don't want it to snap to its own start point.
 * @return {object} data about the end point of an unclosed path, if any such point is within the
 *     tolerance distance of the given point, or null if none exists.
 */
const endPointHit = function (point, tolerance, excludePath) {
    const lines = paper.project.getItems({
        class: paper.Path
    });
    // Prefer more recent lines
    for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].closed) {
            continue;
        }
        if (!(lines[i].parent instanceof paper.Layer)) {
            // Don't connect to lines inside of groups
            continue;
        }
        if (excludePath && lines[i] === excludePath) {
            continue;
        }
        if (lines[i].firstSegment && touching(lines[i].firstSegment.point, point, tolerance)) {
            return {
                path: lines[i],
                segment: lines[i].firstSegment,
                isFirst: true
            };
        }
        if (lines[i].lastSegment && touching(lines[i].lastSegment.point, point, tolerance)) {
            return {
                path: lines[i],
                segment: lines[i].lastSegment,
                isFirst: false
            };
        }
    }
    return null;
};

export {
    endPointHit,
    touching
};
