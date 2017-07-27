import paper from 'paper';
import log from '../log/log';
import broadBrushHelper from './broad-brush-helper';
import segmentBrushHelper from './segment-brush-helper';

/**
 * Shared code for the brush and eraser tool. Adds functions on the paper tool object
 * to handle mouse events, which are delegated to broad-brush-helper and segment-brush-helper
 * based on the brushSize in the state.
 */
class BlobTool {

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
        return 9;
    }
    
    setOptions (options) {
        if (this.tool) {
            this.tool.options = options;
            this.tool.resizeCursorIfNeeded();
        }
    }

    activateTool (isEraser, tool, options) {
        this.tool = tool;

        tool.cursorPreviewLastPoint = new paper.Point(-10000, -10000);
        tool.resizeCursorIfNeeded = function (point) {
            if (typeof point === 'undefined') {
                point = this.cursorPreviewLastPoint;
            } else {
                this.cursorPreviewLastPoint = point;
            }

            if (this.brushSize === this.options.brushSize) {
                return;
            }
            const newPreview = new paper.Path.Circle({
                center: point,
                radius: this.options.brushSize / 2
            });
            if (this.cursorPreview) {
                this.cursorPreview.segments = newPreview.segments;
                newPreview.remove();
            } else {
                this.cursorPreview = newPreview;
            }
            this.brushSize = this.options.brushSize;
        };

        this.setOptions(options);

        tool.stylePath = function (path) {
            if (isEraser) {
                path.fillColor = 'white';
                if (path === this.cursorPreview) {
                    path.strokeColor = 'cornflowerblue';
                    path.strokeWidth = 1;
                }
            } else {
                // TODO: Add back brush styling. Keep a separate active toolbar style for brush vs pen.
                // path = pg.stylebar.applyActiveToolbarStyle(path);

                path.fillColor = 'black';
                if (path === this.cursorPreview) {
                    path.strokeColor = 'cornflowerblue';
                    path.strokeWidth = 1;
                }
            }
        };

        tool.stylePath(this.tool.cursorPreview);

        tool.fixedDistance = 1;

        broadBrushHelper(tool);
        segmentBrushHelper(tool);

        tool.onMouseMove = function (event) {
            tool.resizeCursorIfNeeded(event.point);
            tool.stylePath(this.cursorPreview);
            this.cursorPreview.bringToFront();
            this.cursorPreview.position = event.point;
        };
        
        tool.onMouseDown = function (event) {
            tool.resizeCursorIfNeeded(event.point);
            if (event.event.button > 0) return;  // only first mouse button

            if (this.options.brushSize < BlobTool.THRESHOLD) {
                this.brush = BlobTool.BROAD;
                this.onBroadMouseDown(event);
            } else {
                this.brush = BlobTool.SEGMENT;
                this.onSegmentMouseDown(event);
            }
            this.cursorPreview.bringToFront();
            this.cursorPreview.position = event.point;
            paper.view.draw();
        };

        tool.onMouseDrag = function (event) {
            tool.resizeCursorIfNeeded(event.point);
            if (event.event.button > 0) return;  // only first mouse button
            if (this.brush === BlobTool.BROAD) {
                this.onBroadMouseDrag(event);
            } else if (this.brush === BlobTool.SEGMENT) {
                this.onSegmentMouseDrag(event);
            } else {
                log.warn(`Brush type does not exist: ${this.brush}`);
            }

            this.cursorPreview.bringToFront();
            this.cursorPreview.position = event.point;
            paper.view.draw();
        };

        tool.onMouseUp = function (event) {
            tool.resizeCursorIfNeeded(event.point);
            if (event.event.button > 0) return;  // only first mouse button
            
            let lastPath;
            if (this.brush === BlobTool.BROAD) {
                lastPath = this.onBroadMouseUp(event);
            } else if (this.brush === BlobTool.SEGMENT) {
                lastPath = this.onSegmentMouseUp(event);
            } else {
                log.warn(`Brush type does not exist: ${this.brush}`);
            }

            if (isEraser) {
                tool.mergeEraser(lastPath);
            } else {
                tool.mergeBrush(lastPath);
            }

            this.cursorPreview.bringToFront();
            this.cursorPreview.position = event.point;

            // Reset
            this.brush = null;
            tool.fixedDistance = 1;
        };

        tool.mergeBrush = function (lastPath) {
            // Get all path items to merge with
            const paths = paper.project.getItems({
                match: function (item) {
                    return tool.isMergeable(lastPath, item);
                }
            });

            let mergedPath = lastPath;
            let i;
            // Move down z order to first overlapping item
            for (i = paths.length - 1; i >= 0 && !tool.touches(paths[i], lastPath); i--) {
                continue;
            }
            let mergedPathIndex = i;
            for (; i >= 0; i--) {
                if (!tool.touches(paths[i], lastPath)) {
                    continue;
                }
                if (!paths[i].getFillColor()) {
                    // Ignore for merge. Paths without fill need to be in paths though,
                    // since they can visibly change if z order changes
                } else if (tool.colorMatch(paths[i], lastPath)) {
                    // Make sure the new shape isn't overlapped by anything that would
                    // visibly change if we change its z order
                    for (let j = mergedPathIndex; j > i; j--) {
                        if (tool.touches(paths[j], paths[i])) {
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
            // TODO: Add back undo
            // pg.undo.snapshot('broadbrush');
        };

        tool.mergeEraser = function (lastPath) {
            // Get all path items to merge with
            // If there are selected items, try to erase from amongst those.
            let items = paper.project.getItems({
                match: function (item) {
                    return item.selected && tool.isMergeable(lastPath, item) && tool.touches(lastPath, item);
                }
            });
            // Eraser didn't hit anything selected, so assume they meant to erase from all instead of from subset
            // and deselect the selection
            if (items.length === 0) {
                // TODO: Add back selection handling
                // pg.selection.clearSelection();
                items = paper.project.getItems({
                    match: function (item) {
                        return tool.isMergeable(lastPath, item) && tool.touches(lastPath, item);
                    }
                });
            }
            
            for (let i = items.length - 1; i >= 0; i--) {
                // Erase
                const newPath = items[i].subtract(lastPath);

                // Gather path segments
                const subpaths = [];
                // TODO: Handle compound path
                if (items[i] instanceof paper.Path && !items[i].closed) {
                    const firstSeg = items[i].clone();
                    const intersections = firstSeg.getIntersections(lastPath);
                    // keep first and last segments
                    if (intersections.length === 0) {
                        continue;
                    }
                    for (let j = intersections.length - 1; j >= 0; j--) {
                        subpaths.push(firstSeg.splitAt(intersections[j]));
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

                // Divide topologically separate shapes into their own compound paths, instead of
                // everything being stuck together.
                // Assume that result of erase operation returns clockwise paths for positive shapes
                const clockwiseChildren = [];
                const ccwChildren = [];
                if (newPath.children) {
                    for (let j = newPath.children.length - 1; j >= 0; j--) {
                        const child = newPath.children[j];
                        if (child.isClockwise()) {
                            clockwiseChildren.push(child);
                        } else {
                            ccwChildren.push(child);
                        }
                    }
                    for (let j = 0; j < clockwiseChildren.length; j++) {
                        const cw = clockwiseChildren[j];
                        cw.copyAttributes(newPath);
                        cw.fillColor = newPath.fillColor;
                        cw.strokeColor = newPath.strokeColor;
                        cw.strokeWidth = newPath.strokeWidth;
                        cw.insertAbove(items[i]);
                        
                        // Go backward since we are deleting elements
                        let newCw = cw;
                        for (let k = ccwChildren.length - 1; k >= 0; k--) {
                            const ccw = ccwChildren[k];
                            if (tool.firstEnclosesSecond(ccw, cw) || tool.firstEnclosesSecond(cw, ccw)) {
                                const temp = newCw.subtract(ccw);
                                temp.insertAbove(newCw);
                                newCw.remove();
                                newCw = temp;
                                ccw.remove();
                                ccwChildren.splice(k, 1);
                            }
                        }
                    }
                    newPath.remove();
                }
                items[i].remove();
            }
            lastPath.remove();
            // TODO: Add back undo handling
            // pg.undo.snapshot('eraser');
        };

        tool.colorMatch = function (existingPath, addedPath) {
            // Note: transparent fill colors do notdetect as touching
            return existingPath.getFillColor().equals(addedPath.getFillColor()) &&
                    (addedPath.getStrokeColor() === existingPath.getStrokeColor() || // both null
                        (addedPath.getStrokeColor() &&
                            addedPath.getStrokeColor().equals(existingPath.getStrokeColor()))) &&
                    addedPath.getStrokeWidth() === existingPath.getStrokeWidth() &&
                    tool.touches(existingPath, addedPath);
        };

        tool.touches = function (path1, path2) {
            // Two shapes are touching if their paths intersect
            if (path1 && path2 && path1.intersects(path2)) {
                return true;
            }
            return tool.firstEnclosesSecond(path1, path2) || tool.firstEnclosesSecond(path2, path1);
        };

        tool.firstEnclosesSecond = function (path1, path2) {
            // Two shapes are also touching if one is completely inside the other
            if (path1 && path2 && path2.firstSegment && path2.firstSegment.point &&
                    path1.hitTest(path2.firstSegment.point)) {
                return true;
            }
            // TODO: clean up these no point paths
            return false;
        };

        tool.isMergeable = function (newPath, existingPath) {
            return existingPath instanceof paper.PathItem && // path or compound path
                existingPath !== this.cursorPreview && // don't merge with the mouse preview
                existingPath !== newPath && // don't merge with self
                existingPath.parent instanceof paper.Layer; // don't merge with nested in group
        };
    }

    deactivateTool () {
        if (this.tool) {
            this.tool.cursorPreview.remove();
            this.tool.remove();
        }
    }
}

export default BlobTool;
