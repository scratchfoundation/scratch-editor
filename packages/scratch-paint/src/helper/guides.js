import paper from '@scratch/paper';
import {getGuideLayer} from './layer';
import {getAllRootItems} from './selection';

const GUIDE_BLUE = '#009dec';
const GUIDE_GREY = '#aaaaaa';

const setDefaultGuideStyle = function (item) {
    item.strokeWidth = 1 / paper.view.zoom;
    item.opacity = 1;
    item.blendMode = 'normal';
    item.guide = true;
};

const hoverItem = function (item) {
    const segments = item.segments;
    const clone = new paper.Path(segments);
    setDefaultGuideStyle(clone);
    if (item.closed) {
        clone.closed = true;
    }
    clone.parent = getGuideLayer();
    clone.position = item.position;
    clone.strokeColor = GUIDE_BLUE;
    clone.fillColor = null;
    clone.data.isHelperItem = true;
    clone.data.origItem = item;
    clone.bringToFront();

    return clone;
};

const hoverBounds = function (item, expandBy) {
    let bounds = item.internalBounds;
    if (expandBy) {
        bounds = bounds.expand(expandBy);
    }
    const rect = new paper.Path.Rectangle(bounds);
    rect.matrix = item.matrix;
    setDefaultGuideStyle(rect);
    rect.parent = getGuideLayer();
    rect.strokeColor = GUIDE_BLUE;
    rect.fillColor = null;
    rect.data.isHelperItem = true;
    rect.data.origItem = item;
    rect.bringToFront();

    return rect;
};

const rectSelect = function (event, color) {
    const half = new paper.Point(0.5 / paper.view.zoom, 0.5 / paper.view.zoom);
    const start = event.downPoint.add(half);
    const end = event.point.add(half);
    const rect = new paper.Path.Rectangle(start, end);
    const zoom = 1.0 / paper.view.zoom;
    setDefaultGuideStyle(rect);
    if (!color) color = GUIDE_GREY;
    rect.parent = getGuideLayer();
    rect.strokeColor = color;
    rect.data.isRectSelect = true;
    rect.data.isHelperItem = true;
    rect.dashArray = [3.0 * zoom, 3.0 * zoom];
    return rect;
};

const getGuideColor = function () {
    return GUIDE_BLUE;
};

const _removePaperItemsByDataTags = function (tags) {
    const allItems = getAllRootItems(true);
    for (const item of allItems) {
        for (const tag of tags) {
            if (item.data && item.data[tag]) {
                item.remove();
            }
        }
    }
};

const _removePaperItemsByTags = function (tags) {
    const allItems = getAllRootItems(true);
    for (const item of allItems) {
        for (const tag of tags) {
            if (item[tag]) {
                item.remove();
            }
        }
    }
};

const removeBoundsPath = function () {
    _removePaperItemsByDataTags(['isSelectionBound', 'isRotHandle', 'isScaleHandle']);
};

const removeBoundsHandles = function () {
    _removePaperItemsByDataTags(['isRotHandle', 'isScaleHandle']);
};

const removeAllGuides = function () {
    _removePaperItemsByTags(['guide']);
};

const removeHitPoint = function () {
    _removePaperItemsByDataTags(['isHitPoint']);
};

const drawHitPoint = function (point) {
    removeHitPoint();
    if (point) {
        const hitPoint = paper.Path.Circle(point, 4 / paper.view.zoom /* radius */);
        hitPoint.strokeWidth = 1 / paper.view.zoom;
        hitPoint.strokeColor = GUIDE_BLUE;
        hitPoint.fillColor = new paper.Color(1, 1, 1, 0.5);
        hitPoint.parent = getGuideLayer();
        hitPoint.data.isHitPoint = true;
        hitPoint.data.isHelperItem = true;
    }
};

export {
    hoverItem,
    hoverBounds,
    rectSelect,
    removeAllGuides,
    removeBoundsHandles,
    removeBoundsPath,
    drawHitPoint,
    removeHitPoint,
    getGuideColor,
    setDefaultGuideStyle
};
