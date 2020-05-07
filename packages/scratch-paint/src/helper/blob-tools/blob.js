import paper from '@scratch/paper';
import log from '../../log/log';
import BroadBrushHelper from './broad-brush-helper';
import SegmentBrushHelper from './segment-brush-helper';
import {MIXED, styleCursorPreview} from '../../helper/style-path';
import {clearSelection, getItems} from '../../helper/selection';
import {getGuideLayer, setGuideItem} from '../../helper/layer';
import {isCompoundPathChild} from '../compound-path';

/**
 * Shared code for the brush and eraser mode. Adds functions on the paper tool object
 * to handle mouse events, which are delegated to broad-brush-helper and segment-brush-helper
 * based on the brushSize in the state.
 */
class Blobbiness {
    static get BROAD () {
        return 'broadbrush';
    }
    static get SEGMENT () {
        return 'segmentbrush';
    }

    // If brush size >= threshold use segment brush, else use broadbrush
    // Segment brush has performance issues at low threshold, but broad brush has weird corners
    // which get more obvious the bigger it is
    static get THRESHOLD () {
        return 30 / paper.view.zoom;
    }

    /**
     * @param {function} onUpdateImage call when the drawing has changed to let listeners know
     * @param {function} clearSelectedItems Callback to clear the set of selected items in the Redux state
     */
    constructor (onUpdateImage, clearSelectedItems) {
        this.broadBrushHelper = new BroadBrushHelper();
        this.segmentBrushHelper = new SegmentBrushHelper();
        this.onUpdateImage = onUpdateImage;
        this.clearSelectedItems = clearSelectedItems;

        // The following are stored to check whether these have changed and the cursor preview needs to be redrawn.
        this.strokeColor = null;
        this.brushSize = null;
        this.fillColor = null;
    }

    /**
     * Set configuration options for a blob
     * @param {!object} options Configuration
     * @param {!number} options.brushSize Width of blob marking made by mouse
     * @param {!boolean} options.isEraser Whether the stroke should be treated as an erase path. If false,
     *     the stroke is an additive path.
     * @param {?string} options.fillColor Color of the brush stroke.
     * @param {?string} options.strokeColor Color of the brush outline.
     * @param {?number} options.strokeWidth Width of the brush outline.
     */
    setOptions (options) {
        const oldFillColor = this.options ? this.options.fillColor : 'black';
        const oldStrokeColor = this.options ? this.options.strokeColor : null;
        const oldStrokeWidth = this.options ? this.options.strokeWidth : null;
        // If values are mixed, it means the color was set by a selection contained multiple values.
        // In this case keep drawing with the previous values if any. (For stroke width, null indicates
        // mixed, because stroke width is required to be a number)
        this.options = {
            ...options,
            fillColor: options.fillColor === MIXED ? oldFillColor : options.fillColor,
            strokeColor: options.strokeColor === MIXED ? oldStrokeColor : options.strokeColor,
            strokeWidth: options.strokeWidth === null ? oldStrokeWidth : options.strokeWidth
        };
        this.resizeCursorIfNeeded();
    }

    /**
     * Adds handlers on the mouse tool to draw blobs. Initialize with configuration options for a blob.
     * @param {!object} options Configuration
     * @param {!number} options.brushSize Width of blob marking made by mouse
     * @param {!boolean} options.isEraser Whether the stroke should be treated as an erase path. If false,
     *     the stroke is an additive path.
     * @param {?string} options.fillColor Color of the brush stroke.
     * @param {?string} options.strokeColor Color of the brush outline.
     * @param {?number} options.strokeWidth Width of the brush outline.
     */
    activateTool (options) {
        this.tool = new paper.Tool();
        this.cursorPreviewLastPoint = new paper.Point(-10000, -10000);
        this.setOptions(options);
        this.tool.active = false;
        this.tool.fixedDistance = 1;

        const blob = this;
        this.tool.onMouseMove = function (event) {
            blob.resizeCursorIfNeeded(event.point);
            styleCursorPreview(blob.cursorPreview, blob.options);
            blob.cursorPreview.bringToFront();
            blob.cursorPreview.position = event.point;
        };

        this.tool.onMouseDown = function (event) {
            blob.resizeCursorIfNeeded(event.point);
            if (event.event.button > 0) return; // only first mouse button
            this.active = true;

            if (blob.options.brushSize < Blobbiness.THRESHOLD) {
                blob.brush = Blobbiness.BROAD;
                blob.broadBrushHelper.onBroadMouseDown(event, blob.tool, blob.options);
            } else {
                blob.brush = Blobbiness.SEGMENT;
                blob.segmentBrushHelper.onSegmentMouseDown(event, blob.tool, blob.options);
            }
            blob.cursorPreview.bringToFront();
            blob.cursorPreview.position = event.point;
        };

        this.tool.onMouseDrag = function (event) {
            if (event.event.button > 0 || !this.active) return; // only first mouse button
            if (blob.brush === Blobbiness.BROAD) {
                blob.broadBrushHelper.onBroadMouseDrag(event, blob.tool, blob.options);
            } else if (blob.brush === Blobbiness.SEGMENT) {
                blob.segmentBrushHelper.onSegmentMouseDrag(event, blob.tool, blob.options);
            } else {
                log.warn(`Brush type does not exist: ${blob.brush}`);
            }

            blob.cursorPreview.bringToFront();
            blob.cursorPreview.position = event.point;
        };

        this.tool.onMouseUp = function (event) {
            if (event.event.button > 0 || !this.active) return; // only first mouse button

            let lastPath;
            if (blob.brush === Blobbiness.BROAD) {
                lastPath = blob.broadBrushHelper.onBroadMouseUp(event, blob.tool, blob.options);
            } else if (blob.brush === Blobbiness.SEGMENT) {
                lastPath = blob.segmentBrushHelper.onSegmentMouseUp(event, blob.tool, blob.options);
            } else {
                log.warn(`Brush type does not exist: ${blob.brush}`);
            }

            if (blob.options.isEraser) {
                blob.mergeEraser(lastPath);
            } else {
                blob.mergeBrush(lastPath);
            }

            // Remove cursor preview during snapshot, then bring it back
            blob.cursorPreview.remove();
            blob.onUpdateImage();
            blob.cursorPreview.parent = getGuideLayer();

            // Reset
            blob.brush = null;
            this.fixedDistance = 1;
            this.active = false;
        };
        this.tool.activate();
    }

    resizeCursorIfNeeded (point) {
        if (!this.options) {
            return;
        }
        // The cursor preview was unattached from the view by an outside process,
        // such as changing costumes or undo.
        if (this.cursorPreview && !this.cursorPreview.parent) {
            this.cursorPreview = null;
        }
        if (this.cursorPreview &&
                this.brushSize === this.options.brushSize &&
                this.fillColor === this.options.fillColor &&
                this.strokeColor === this.options.strokeColor &&
                this.cursorPreviewLastPoint.equals(point)) {
            return;
        }
        if (typeof point !== 'undefined') {
            this.cursorPreviewLastPoint = point;
        }

        if (!this.cursorPreview) {
            this.cursorPreview = new paper.Shape.Ellipse({
                point: this.cursorPreviewLastPoint,
                size: this.options.brushSize / 2
            });
            this.cursorPreview.parent = getGuideLayer();
            this.cursorPreview.data.isHelperItem = true;
            setGuideItem(this.cursorPreview);
        }
        this.cursorPreview.position = this.cursorPreviewLastPoint;
        this.cursorPreview.radius = this.options.brushSize / 2;
        this.brushSize = this.options.brushSize;
        this.fillColor = this.options.fillColor;
        this.strokeColor = this.options.strokeColor;
        styleCursorPreview(this.cursorPreview, this.options);
    }

    mergeBrush (lastPath) {
        const blob = this;

        // Get all path items to merge with
        const paths = getItems({
            match: function (item) {
                return blob.isMergeable(lastPath, item) &&
                    item.parent instanceof paper.Layer; // don't merge with nested in group
            }
        });

        let mergedPath = lastPath;
        let i;
        // Move down z order to first overlapping item
        for (i = paths.length - 1; i >= 0 && !this.touches(paths[i], lastPath); i--) {
            continue;
        }
        let mergedPathIndex = i;
        for (; i >= 0; i--) {
            if (!this.touches(paths[i], lastPath)) {
                continue;
            }
            if (!paths[i].getFillColor()) {
                // Ignore for merge. Paths without fill need to be in paths though,
                // since they can visibly change if z order changes
            } else if (this.colorMatch(paths[i], lastPath)) {
                // Make sure the new shape isn't overlapped by anything that would
                // visibly change if we change its z order
                for (let j = mergedPathIndex; j > i; j--) {
                    if (this.touches(paths[j], paths[i])) {
                        continue;
                    }
                }
                // Merge same fill color
                const tempPath = mergedPath.unite(paths[i]);
                tempPath.strokeColor = paths[i].strokeColor;
                tempPath.strokeWidth = paths[i].strokeWidth;
                if (mergedPath === lastPath) {
                    tempPath.insertAbove(paths[i]); // First intersected path determines z position of the new path
                } else {
                    tempPath.insertAbove(mergedPath); // Rest of merges join z index of merged path
                    mergedPathIndex--; // Removed an item, so the merged path index decreases
                }
                mergedPath.remove();
                mergedPath = tempPath;
                paths[i].remove();
                paths.splice(i, 1);
            }
        }
    }

    mergeEraser (lastPath) {
        const blob = this;

        // Get all path items to merge with
        // If there are selected items, try to erase from amongst those.
        let items = getItems({
            match: function (item) {
                return item.selected && blob.isMergeable(lastPath, item) &&
                    blob.touches(lastPath, item) &&
                    // Boolean operations will produce incorrect results if directly applied to compound path children,
                    // so exclude those. Their parents are also selected so boolean operations will apply to them.
                    !isCompoundPathChild(item);
            },
            class: paper.PathItem
        });
        // Eraser didn't hit anything selected, so assume they meant to erase from all instead of from subset
        // and deselect the selection
        if (items.length === 0) {
            clearSelection(this.clearSelectedItems);
            items = getItems({
                match: function (item) {
                    return blob.isMergeable(lastPath, item) &&
                        blob.touches(lastPath, item) &&
                        !isCompoundPathChild(item);
                },
                class: paper.PathItem
            });
        }

        for (let i = items.length - 1; i >= 0; i--) {
            if (items[i] instanceof paper.Path && (!items[i].fillColor || items[i].fillColor._alpha === 0)) {
                // Gather path segments
                const subpaths = [];
                const firstSeg = items[i];
                const intersections = firstSeg.getIntersections(lastPath);
                for (let j = intersections.length - 1; j >= 0; j--) {
                    const split = firstSeg.splitAt(intersections[j]);
                    if (split) {
                        split.insertAbove(firstSeg);
                        subpaths.push(split);
                    }
                }
                subpaths.push(firstSeg);

                // Remove the ones that are within the eraser stroke boundary
                for (let k = subpaths.length - 1; k >= 0; k--) {
                    const segMidpoint = subpaths[k].getLocationAt(subpaths[k].length / 2).point;
                    if (lastPath.contains(segMidpoint)) {
                        subpaths[k].remove();
                        subpaths.splice(k, 1);
                    }
                }
                lastPath.remove();
                continue;
            }

            // Erase
            const newPath = items[i].subtract(lastPath);
            newPath.insertBelow(items[i]);

            // Gather path segments
            const subpaths = [];
            if (items[i] instanceof paper.Path && !items[i].closed) {
                const firstSeg = items[i].clone();
                const intersections = firstSeg.getIntersections(lastPath);
                // keep first and last segments
                for (let j = intersections.length - 1; j >= 0; j--) {
                    const split = firstSeg.splitAt(intersections[j]);
                    split.insertAbove(firstSeg);
                    subpaths.push(split);
                }
                subpaths.push(firstSeg);
            }

            // Remove the ones that are within the eraser stroke boundary, or are already part of new path.
            // This way subpaths only remain if they didn't get turned into a shape by subtract.
            for (let k = subpaths.length - 1; k >= 0; k--) {
                const segMidpoint = subpaths[k].getLocationAt(subpaths[k].length / 2).point;
                if (lastPath.contains(segMidpoint) || newPath.contains(segMidpoint)) {
                    subpaths[k].remove();
                    subpaths.splice(k, 1);
                }
            }

            if (newPath.children) {
                this.separateCompoundPath(newPath);
                newPath.remove();
            }
            items[i].remove();
        }
        lastPath.remove();
    }

    separateCompoundPath (compoundPath) {
        if (!compoundPath.isClockwise()) {
            compoundPath.reverse();
        }
        // Divide topologically separate shapes into their own compound paths, instead of
        // everything being stuck together.
        const clockwiseChildren = [];
        const ccwChildren = [];
        for (let j = compoundPath.children.length - 1; j >= 0; j--) {
            const child = compoundPath.children[j];
            if (child.isClockwise()) {
                clockwiseChildren.push(child);
            } else {
                ccwChildren.push(child);
            }
        }

        // Sort by area smallest to largest
        clockwiseChildren.sort((a, b) => a.area - b.area);
        ccwChildren.sort((a, b) => Math.abs(a.area) - Math.abs(b.area));
        // Go smallest to largest non-hole, so larger non-holes don't get the smaller pieces' holes
        for (let j = 0; j < clockwiseChildren.length; j++) {
            const cw = clockwiseChildren[j];
            cw.copyAttributes(compoundPath);
            cw.fillColor = compoundPath.fillColor;
            cw.strokeColor = compoundPath.strokeColor;
            cw.strokeWidth = compoundPath.strokeWidth;
            cw.insertAbove(compoundPath);

            // Go backward since we are deleting elements. Backwards is largest to smallest hole.
            let newCw = cw;
            for (let k = ccwChildren.length - 1; k >= 0; k--) {
                const ccw = ccwChildren[k];
                if (this.firstEnclosesSecond(cw, ccw)) {
                    const temp = newCw.subtract(ccw);
                    temp.insertAbove(compoundPath);
                    newCw.remove();
                    newCw = temp;
                    ccw.remove();
                    ccwChildren.splice(k, 1);
                }
            }
        }
    }

    colorMatch (existingPath, addedPath) {
        // Note: transparent fill colors do notdetect as touching
        return existingPath.getFillColor().equals(addedPath.getFillColor()) &&
                (addedPath.getStrokeColor() === existingPath.getStrokeColor() || // both null
                    (addedPath.getStrokeColor() &&
                        addedPath.getStrokeColor().equals(existingPath.getStrokeColor()))) &&
                addedPath.getStrokeWidth() === existingPath.getStrokeWidth() &&
                this.touches(existingPath, addedPath);
    }

    touches (path1, path2) {
        // Two shapes are touching if their paths intersect
        if (path1 && path2 && path1.intersects(path2)) {
            return true;
        }
        return this.firstEnclosesSecond(path1, path2) || this.firstEnclosesSecond(path2, path1);
    }

    firstEnclosesSecond (path1, path2) {
        // Two shapes are also touching if one is completely inside the other
        if (path1 && path2 && path2.firstSegment && path2.firstSegment.point &&
                path1.hitTest(path2.firstSegment.point)) {
            return true;
        }
        // TODO: clean up these no point paths
        return false;
    }

    matchesAnyChild (group, path) {
        for (const child of group.children) {
            if (child.children && this.matchesAnyChild(path, child)) {
                return true;
            }
            if (path === child) {
                return true;
            }
        }
        return false;
    }

    isMergeable (newPath, existingPath) {
        // Path or compound path
        if (!(existingPath instanceof paper.PathItem)) {
            return;
        }
        if (newPath.children) {
            if (this.matchesAnyChild(newPath, existingPath)) { // Don't merge with children of self
                return false;
            }
        }
        return existingPath !== newPath; // don't merge with self
    }

    deactivateTool () {
        if (this.cursorPreview) {
            this.cursorPreview.remove();
            this.cursorPreview = null;
        }
        this.tool.remove();
        this.tool = null;
    }
}

export default Blobbiness;
