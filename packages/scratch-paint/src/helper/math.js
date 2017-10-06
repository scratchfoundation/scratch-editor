import paper from 'paper';

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

export {
    checkPointsClose,
    getRandomInt,
    getRandomBoolean,
    snapDeltaToAngle
};
