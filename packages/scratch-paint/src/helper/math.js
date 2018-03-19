import paper from '@scratch/paper';

/** The ratio of the curve length to use for the handle length to convert squares into approximately circles. */
const HANDLE_RATIO = 0.3902628565;

const checkPointsClose = function (startPos, eventPoint, threshold) {
    const xOff = Math.abs(startPos.x - eventPoint.x);
    const yOff = Math.abs(startPos.y - eventPoint.y);
    if (xOff < threshold && yOff < threshold) {
        return true;
    }
    return false;
};

const getRandomInt = function (min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
};

const getRandomBoolean = function () {
    return getRandomInt(0, 2) === 1;
};

// Thanks Mikko Mononen! https://github.com/memononen/stylii
const snapDeltaToAngle = function (delta, snapAngle) {
    let angle = Math.atan2(delta.y, delta.x);
    angle = Math.round(angle / snapAngle) * snapAngle;
    const dirx = Math.cos(angle);
    const diry = Math.sin(angle);
    const d = (dirx * delta.x) + (diry * delta.y);
    return new paper.Point(dirx * d, diry * d);
};

const _getDepth = function (item) {
    let temp = item;
    let depth = 0;
    while (!(temp instanceof paper.Layer)) {
        depth++;
        if (temp.parent === null) {
            // This item isn't attached to a layer, so it's not on the canvas and can't be compared.
            return null;
        }
        temp = temp.parent;
    }
    return depth;
};

const sortItemsByZIndex = function (a, b) {
    if (a === null || b === null) {
        return null;
    }

    // Get to the same depth in the project tree
    let tempA = a;
    let tempB = b;
    let aDepth = _getDepth(a);
    let bDepth = _getDepth(b);
    while (bDepth > aDepth) {
        tempB = tempB.parent;
        bDepth--;
    }
    while (aDepth > bDepth) {
        tempA = tempA.parent;
        aDepth--;
    }

    // Step up until they share parents. When they share parents, compare indices.
    while (tempA && tempB) {
        if (tempB === tempA) {
            return 0;
        } else if (tempB.parent === tempA.parent) {
            if (tempB.parent instanceof paper.CompoundPath) {
                // Neither is on top of the other in a compound path. Return in order of decreasing size.
                return Math.abs(tempB.area) - Math.abs(tempA.area);
            }
            return parseFloat(tempA.index) - parseFloat(tempB.index);
        }
        tempB = tempB.parent;
        tempA = tempA.parent;
    }

    // No shared hierarchy
    return null;
};

// Expand the size of the path by amount all around
const expandBy = function (path, amount) {
    const center = path.position;
    let pathArea = path.area;
    for (const seg of path.segments) {
        const delta = seg.point.subtract(center)
            .normalize()
            .multiply(amount);
        seg.point = seg.point.add(delta);
        // If that made the path area smaller, go the other way.
        if (path.area < pathArea) seg.point = seg.point.subtract(delta.multiply(2));
        pathArea = path.area;
    }
};

// Make item clockwise. Drill down into groups.
const ensureClockwise = function (item) {
    if (item instanceof paper.Group) {
        for (const child of item.children) {
            ensureClockwise(child);
        }
    } else if (item instanceof paper.PathItem) {
        item.clockwise = true;
    }
};

export {
    HANDLE_RATIO,
    checkPointsClose,
    ensureClockwise,
    expandBy,
    getRandomInt,
    getRandomBoolean,
    snapDeltaToAngle,
    sortItemsByZIndex
};
