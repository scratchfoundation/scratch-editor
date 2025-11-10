/**
 * Calculates the distance between two points based on their coordinates
 * @param {{x: number, y: number}} pointA - First point with x and y coordinates.
 * @param {{x: number, y: number}} pointB - Second point with x and y coordinates.
 * @returns {number} The distance between the two points
 * @private
 */
const distance = function (pointA, pointB) {
    const dx = pointA.x - pointB.x;
    const dy = pointA.y - pointB.y;
    return Math.sqrt((dx * dx) + (dy * dy));
};

/**
 * Convert a point to Scratch coordinates.
 * @param {{x: number, y: number}} position - Original coordinates of the point.
 * @returns {{x: number, y: number}} Converted point in Scratch coordinates.
 */
const toScratchCoords = function (position) {
    return {
        x: position.x - 240,
        y: 180 - position.y
    };
};

module.exports = {distance, toScratchCoords};
