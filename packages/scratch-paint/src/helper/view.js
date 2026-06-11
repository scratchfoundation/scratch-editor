import paper from '@scratch/paper';
import {CROSSHAIR_SIZE, getBackgroundGuideLayer, getDragCrosshairLayer, getRaster} from './layer';
import {getAllRootItems, getSelectedRootItems} from './selection';
import {getHitBounds} from './bitmap';
import log from '../log/log';

// Vectors are imported and exported at SVG_ART_BOARD size.
// Once they are imported however, both SVGs and bitmaps are on
// canvases of ART_BOARD size.
// (This is for backwards compatibility, to handle both assets
// designed for 480 x 360, and bitmap resolution 2 bitmaps)
const SVG_ART_BOARD_WIDTH = 480;
const SVG_ART_BOARD_HEIGHT = 360;
const ART_BOARD_WIDTH = SVG_ART_BOARD_WIDTH * 2;
const ART_BOARD_HEIGHT = SVG_ART_BOARD_HEIGHT * 2;
const CENTER = new paper.Point(ART_BOARD_WIDTH / 2, ART_BOARD_HEIGHT / 2);
const PADDING_PERCENT = 25; // Padding as a percent of the max of width/height of the sprite
const BUFFER = 50; // Number of pixels of allowance around objects at the edges of the workspace
const MIN_RATIO = .125; // Zoom in to at least 1/8 of the screen. This way you don't end up incredibly
//                         zoomed in for tiny costumes.
const OUTERMOST_ZOOM_LEVEL = 0.333;
const ART_BOARD_BOUNDS = new paper.Rectangle(0, 0, ART_BOARD_WIDTH, ART_BOARD_HEIGHT);
const MAX_WORKSPACE_BOUNDS = new paper.Rectangle(
    -ART_BOARD_WIDTH / 4,
    -ART_BOARD_HEIGHT / 4,
    ART_BOARD_WIDTH * 1.5,
    ART_BOARD_HEIGHT * 1.5);

let _workspaceBounds = ART_BOARD_BOUNDS;

const getWorkspaceBounds = () => _workspaceBounds;

/**
 * The workspace bounds define the areas that the scroll bars can access.
 * They include at minimum the artboard, and extend to a bit beyond the
 * farthest item off the edge in any given direction (so items can't be
 * "lost" off the edge)
 * @param {boolean} clipEmpty Clip empty space from bounds, even if it
 * means discontinuously jumping the viewport. This should probably be
 * false unless the viewport is going to move discontinuously anyway
 * (such as in a zoom button click)
 */
const setWorkspaceBounds = clipEmpty => {
    const items = getAllRootItems();
    // Include the artboard and what's visible in the viewport
    let bounds = ART_BOARD_BOUNDS;
    if (!clipEmpty) {
        bounds = bounds.unite(paper.view.bounds);
    }
    // Include everything the user has drawn and a buffer around it
    for (const item of items) {
        bounds = bounds.unite(item.bounds.expand(BUFFER));
    }
    // Limit to max workspace bounds
    bounds = bounds.intersect(MAX_WORKSPACE_BOUNDS.expand(BUFFER));
    let top = bounds.top;
    let left = bounds.left;
    let bottom = bounds.bottom;
    let right = bounds.right;

    // Center in view if viewport is larger than workspace
    let hDiff = 0;
    let vDiff = 0;
    if (bounds.width < paper.view.bounds.width) {
        hDiff = (paper.view.bounds.width - bounds.width) / 2;
        left -= hDiff;
        right += hDiff;
    }
    if (bounds.height < paper.view.bounds.height) {
        vDiff = (paper.view.bounds.height - bounds.height) / 2;
        top -= vDiff;
        bottom += vDiff;
    }

    _workspaceBounds = new paper.Rectangle(left, top, right - left, bottom - top);
};

const clampViewBounds = () => {
    const {left, right, top, bottom} = paper.project.view.bounds;
    if (left < _workspaceBounds.left) {
        paper.project.view.scrollBy(new paper.Point(_workspaceBounds.left - left, 0));
    }
    if (top < _workspaceBounds.top) {
        paper.project.view.scrollBy(new paper.Point(0, _workspaceBounds.top - top));
    }
    if (bottom > _workspaceBounds.bottom) {
        paper.project.view.scrollBy(new paper.Point(0, _workspaceBounds.bottom - bottom));
    }
    if (right > _workspaceBounds.right) {
        paper.project.view.scrollBy(new paper.Point(_workspaceBounds.right - right, 0));
    }
    setWorkspaceBounds();
};

const resizeCrosshair = () => {
    if (getDragCrosshairLayer() && getDragCrosshairLayer().dragCrosshair) {
        getDragCrosshairLayer().dragCrosshair.scale(
            CROSSHAIR_SIZE / getDragCrosshairLayer().dragCrosshair.bounds.width / paper.view.zoom);
    }
    if (getBackgroundGuideLayer() && getBackgroundGuideLayer().dragCrosshair) {
        getBackgroundGuideLayer().dragCrosshair.scale(
            CROSSHAIR_SIZE / getBackgroundGuideLayer().dragCrosshair.bounds.width / paper.view.zoom);
    }
};

// Zoom keeping a project-space point fixed.
// This article was helpful http://matthiasberth.com/tech/stable-zoom-and-pan-in-paperjs
const zoomOnFixedPoint = (deltaZoom, fixedPoint) => {
    const view = paper.view;
    const preZoomCenter = view.center;
    const newZoom = Math.max(OUTERMOST_ZOOM_LEVEL, view.zoom + deltaZoom);
    const scaling = view.zoom / newZoom;
    const preZoomOffset = fixedPoint.subtract(preZoomCenter);
    const postZoomOffset = fixedPoint.subtract(preZoomOffset.multiply(scaling))
        .subtract(preZoomCenter);
    view.zoom = newZoom;
    view.translate(postZoomOffset.multiply(-1));

    setWorkspaceBounds(true /* clipEmpty */);
    clampViewBounds();
    resizeCrosshair();
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
    setWorkspaceBounds(true /* clipEmpty */);
    resizeCrosshair();
    clampViewBounds();
};

const pan = (dx, dy) => {
    paper.project.view.scrollBy(new paper.Point(dx, dy));
    clampViewBounds();
};

/**
 * Mouse actions are clamped to action bounds
 * @param {boolean} isBitmap True if the editor is in bitmap mode, false if it is in vector mode
 * @returns {paper.Rectangle} the bounds within which mouse events should work in the paint editor
 */
const getActionBounds = isBitmap => {
    if (isBitmap) {
        return ART_BOARD_BOUNDS;
    }
    return paper.view.bounds.unite(ART_BOARD_BOUNDS).intersect(MAX_WORKSPACE_BOUNDS);
};

const zoomToFit = isBitmap => {
    resetZoom();
    let bounds;
    if (isBitmap) {
        bounds = getHitBounds(getRaster()).expand(BUFFER);
    } else {
        const items = getAllRootItems();
        for (const item of items) {
            if (bounds) {
                bounds = bounds.unite(item.bounds);
            } else {
                bounds = item.bounds;
            }
        }
    }
    if (bounds && bounds.width && bounds.height) {
        const canvas = paper.view.element;
        // Ratio of (sprite length plus padding on all sides) to viewport length.
        let ratio = paper.view.zoom *
            Math.max(
                bounds.width * (1 + (2 * PADDING_PERCENT / 100)) / canvas.clientWidth,
                bounds.height * (1 + (2 * PADDING_PERCENT / 100)) / canvas.clientHeight);
        // Clamp ratio
        ratio = Math.max(Math.min(1, ratio), MIN_RATIO);
        if (ratio < 1) {
            paper.view.center = bounds.center;
            paper.view.zoom = paper.view.zoom / ratio;
            resizeCrosshair();
            clampViewBounds();
        }
    } else {
        log.warn('No bounds!');
    }
};

export {
    ART_BOARD_BOUNDS,
    ART_BOARD_HEIGHT,
    ART_BOARD_WIDTH,
    CENTER,
    OUTERMOST_ZOOM_LEVEL,
    SVG_ART_BOARD_WIDTH,
    SVG_ART_BOARD_HEIGHT,
    MAX_WORKSPACE_BOUNDS,
    clampViewBounds,
    getActionBounds,
    pan,
    resetZoom,
    setWorkspaceBounds,
    getWorkspaceBounds,
    resizeCrosshair,
    zoomOnSelection,
    zoomOnFixedPoint,
    zoomToFit
};
