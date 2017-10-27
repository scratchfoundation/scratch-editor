import paper from '@scratch/paper';
import {getSelectedRootItems} from './selection';

const clampViewBounds = () => {
    const {left, right, top, bottom} = paper.project.view.bounds;
    if (left < 0) {
        paper.project.view.scrollBy(new paper.Point(-left, 0));
    }
    if (top < 0) {
        paper.project.view.scrollBy(new paper.Point(0, -top));
    }
    if (bottom > 400) {
        paper.project.view.scrollBy(new paper.Point(0, 400 - bottom));
    }
    if (right > 500) {
        paper.project.view.scrollBy(new paper.Point(500 - right, 0));
    }
};

// Zoom keeping the selection center (if any) fixed.
const zoomOnSelection = deltaZoom => {
    let fixedPoint;
    const items = getSelectedRootItems();
    if (items.length > 0) {
        let rect = null;
        for (const item of items) {
            if (rect) {
                rect = rect.unite(item.bounds);
            } else {
                rect = item.bounds;
            }
        }
        fixedPoint = rect.center;
    } else {
        fixedPoint = paper.project.view.center;
    }
    zoomOnFixedPoint(deltaZoom, fixedPoint);
};

// Zoom keeping a project-space point fixed.
// This article was helpful http://matthiasberth.com/tech/stable-zoom-and-pan-in-paperjs
const zoomOnFixedPoint = (deltaZoom, fixedPoint) => {
    const {view} = paper.project;
    const preZoomCenter = view.center;
    const newZoom = Math.max(1, view.zoom + deltaZoom);
    const scaling = view.zoom / newZoom;
    const preZoomOffset = fixedPoint.subtract(preZoomCenter);
    const postZoomOffset = fixedPoint.subtract(preZoomOffset.multiply(scaling))
        .subtract(preZoomCenter);
    view.zoom = newZoom;
    view.translate(postZoomOffset.multiply(-1));
    clampViewBounds();
};

const resetZoom = () => {
    paper.project.view.zoom = 1;
    clampViewBounds();
};

const pan = (dx, dy) => {
    paper.project.view.scrollBy(new paper.Point(dx, dy));
    clampViewBounds();
};

export {
    pan,
    resetZoom,
    zoomOnSelection,
    zoomOnFixedPoint
};
