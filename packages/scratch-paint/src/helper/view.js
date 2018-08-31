import paper from '@scratch/paper';
import {getSelectedRootItems} from './selection';
import {getRaster} from './layer';
import {getHitBounds} from './bitmap';

// Vectors are imported and exported at SVG_ART_BOARD size.
// Once they are imported however, both SVGs and bitmaps are on
// canvases of ART_BOARD size.
const SVG_ART_BOARD_WIDTH = 480;
const SVG_ART_BOARD_HEIGHT = 360;
const ART_BOARD_WIDTH = 480 * 2;
const ART_BOARD_HEIGHT = 360 * 2;
const PADDING_PERCENT = 25; // Padding as a percent of the max of width/height of the sprite
const MIN_RATIO = .125; // Zoom in to at least 1/8 of the screen. This way you don't end up incredibly
// zoomed in for tiny costumes.

const clampViewBounds = () => {
    const {left, right, top, bottom} = paper.project.view.bounds;
    if (left < 0) {
        paper.project.view.scrollBy(new paper.Point(-left, 0));
    }
    if (top < 0) {
        paper.project.view.scrollBy(new paper.Point(0, -top));
    }
    if (bottom > ART_BOARD_HEIGHT) {
        paper.project.view.scrollBy(new paper.Point(0, ART_BOARD_HEIGHT - bottom));
    }
    if (right > ART_BOARD_WIDTH) {
        paper.project.view.scrollBy(new paper.Point(ART_BOARD_WIDTH - right, 0));
    }
};

// Zoom keeping a project-space point fixed.
// This article was helpful http://matthiasberth.com/tech/stable-zoom-and-pan-in-paperjs
const zoomOnFixedPoint = (deltaZoom, fixedPoint) => {
    const view = paper.view;
    const preZoomCenter = view.center;
    const newZoom = Math.max(0.5, view.zoom + deltaZoom);
    const scaling = view.zoom / newZoom;
    const preZoomOffset = fixedPoint.subtract(preZoomCenter);
    const postZoomOffset = fixedPoint.subtract(preZoomOffset.multiply(scaling))
        .subtract(preZoomCenter);
    view.zoom = newZoom;
    view.translate(postZoomOffset.multiply(-1));
    clampViewBounds();
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

const resetZoom = () => {
    paper.project.view.zoom = .5;
    clampViewBounds();
};

const pan = (dx, dy) => {
    paper.project.view.scrollBy(new paper.Point(dx, dy));
    clampViewBounds();
};

const zoomToFit = isBitmap => {
    resetZoom();
    let bounds;
    if (isBitmap) {
        bounds = getHitBounds(getRaster());
    } else {
        bounds = paper.project.activeLayer.bounds;
    }
    if (bounds && bounds.width && bounds.height) {
        // Ratio of (sprite length plus padding on all sides) to art board length.
        let ratio = Math.max(bounds.width * (1 + (2 * PADDING_PERCENT / 100)) / ART_BOARD_WIDTH,
            bounds.height * (1 + (2 * PADDING_PERCENT / 100)) / ART_BOARD_HEIGHT);
        // Clamp ratio
        ratio = Math.max(Math.min(1, ratio), MIN_RATIO);
        if (ratio < 1) {
            paper.view.center = bounds.center;
            paper.view.zoom = paper.view.zoom / ratio;
            clampViewBounds();
        }
    }
};

export {
    ART_BOARD_HEIGHT,
    ART_BOARD_WIDTH,
    SVG_ART_BOARD_WIDTH,
    SVG_ART_BOARD_HEIGHT,
    clampViewBounds,
    pan,
    resetZoom,
    zoomOnSelection,
    zoomOnFixedPoint,
    zoomToFit
};
