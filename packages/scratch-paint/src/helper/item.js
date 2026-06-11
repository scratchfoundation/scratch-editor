import paper from '@scratch/paper';

const getRootItem = function (item) {
    if (item.parent.className === 'Layer') {
        return item;
    }
    return getRootItem(item.parent);
};

const isBoundsItem = function (item) {
    if (item.className === 'PointText' ||
        item.className === 'Shape' ||
        item.className === 'PlacedSymbol' ||
        item.className === 'Raster') {
        return true;
    }
    return false;
};


const isPathItem = function (item) {
    return item.className === 'Path';
};


const isCompoundPathItem = function (item) {
    return item.className === 'CompoundPath';
};


const isGroupItem = function (item) {
    return item && item.className && item.className === 'Group';
};


const isPointTextItem = function (item) {
    return item.className === 'PointText';
};


const isPGTextItem = function (item) {
    return getRootItem(item).data.isPGTextItem;
};

const setPivot = function (item, point) {
    if (isBoundsItem(item)) {
        item.pivot = item.globalToLocal(point);
    } else {
        item.pivot = point;
    }
};


const getPositionInView = function (item) {
    const itemPos = new paper.Point();
    itemPos.x = item.position.x - paper.view.bounds.x;
    itemPos.y = item.position.y - paper.view.bounds.y;
    return itemPos;
};


const setPositionInView = function (item, pos) {
    item.position.x = paper.view.bounds.x + pos.x;
    item.position.y = paper.view.bounds.y + pos.y;
};

export {
    isBoundsItem,
    isPathItem,
    isCompoundPathItem,
    isGroupItem,
    isPointTextItem,
    isPGTextItem,
    setPivot,
    getPositionInView,
    setPositionInView,
    getRootItem
};
