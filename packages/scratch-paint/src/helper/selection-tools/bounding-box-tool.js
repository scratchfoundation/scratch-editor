import paper from '@scratch/paper';
import keyMirror from 'keymirror';

import {getSelectedRootItems} from '../selection';
import {getGuideColor, removeBoundsPath, removeBoundsHandles} from '../guides';
import {getGuideLayer} from '../layer';

import Cursors from '../../lib/cursors';
import ScaleTool from './scale-tool';
import RotateTool from './rotate-tool';
import MoveTool from './move-tool';

/** SVG for the rotation icon on the bounding box */
const ARROW_PATH = 'M19.28,1.09C19.28.28,19,0,18.2,0c-1.67,0-3.34,0-5,0-.34,0-.88.24-1,.47a1.4,1.4,' +
    '0,0,0,.36,1.08,15.27,15.27,0,0,0,1.46,1.36A6.4,6.4,0,0,1,6.52,4,5.85,5.85,0,0,1,5.24,3,15.27,15.27,' +
    '0,0,0,6.7,1.61,1.4,1.4,0,0,0,7.06.54C7,.3,6.44.07,6.1.06c-1.67,0-3.34,0-5,0C.28,0,0,.31,0,1.12c0,1.67,' +
    '0,3.34,0,5a1.23,1.23,0,0,0,.49,1,1.22,1.22,0,0,0,1-.31A14.38,14.38,0,0,0,2.84,5.26l.73.62a9.45,9.45,' +
    '0,0,0,7.34,2,9.45,9.45,0,0,0,4.82-2.05l.73-.62a14.38,14.38,0,0,0,1.29,1.51,1.22,1.22,' +
    '0,0,0,1,.31,1.23,1.23,0,0,0,.49-1C19.31,4.43,19.29,2.76,19.28,1.09Z';
/** Modes of the bounding box tool, which can do many things depending on how it's used. */
const BoundingBoxModes = keyMirror({
    SCALE: null,
    ROTATE: null,
    MOVE: null
});

/**
 * Tool that handles transforming the selection and drawing a bounding box with handles.
 * On mouse down, the type of function (move, scale, rotate) is determined based on what is clicked
 * (scale handle, rotate handle, the object itself). This determines the mode of the tool, which then
 * delegates actions to the MoveTool, RotateTool or ScaleTool accordingly.
 * @param {!function} onUpdateImage A callback to call when the image visibly changes
 */
class BoundingBoxTool {
    /**
     * @param {Modes} mode Paint editor mode
     * @param {function} setSelectedItems Callback to set the set of selected items in the Redux state
     * @param {function} clearSelectedItems Callback to clear the set of selected items in the Redux state
     * @param {function} setCursor Callback to set the visible mouse cursor
     * @param {!function} onUpdateImage A callback to call when the image visibly changes
     * @param {?function} switchToTextTool A callback to call to switch to the text tool
     */
    constructor (mode, setSelectedItems, clearSelectedItems, setCursor, onUpdateImage, switchToTextTool) {
        this.dispatchSetCursor = setCursor;
        this.onUpdateImage = onUpdateImage;
        this.mode = null;
        this.boundsPath = null;
        this.boundsScaleHandles = [];
        this.boundsRotHandles = [];
        this._modeMap = {};
        this._modeMap[BoundingBoxModes.SCALE] = new ScaleTool(onUpdateImage);
        this._modeMap[BoundingBoxModes.ROTATE] = new RotateTool(onUpdateImage);
        this._modeMap[BoundingBoxModes.MOVE] =
            new MoveTool(mode, setSelectedItems, clearSelectedItems, onUpdateImage, switchToTextTool);
        this._currentCursor = null;
    }

    /**
     * Should be called if the selection changes to update the bounds of the bounding box.
     * @param {?Array<paper.Item>} selectedItems Array of selected items.
     */
    onSelectionChanged (selectedItems) {
        if (selectedItems && selectedItems.length) {
            this.setSelectionBounds();
        } else {
            this.removeBoundsPath();
        }
    }

    /**
     * @param {!MouseEvent} event The mouse event
     * @param {boolean} clone Whether to clone on mouse down (e.g. alt key held)
     * @param {boolean} multiselect Whether to multiselect on mouse down (e.g. shift key held)
     * @param {?boolean} doubleClicked True if this is the second click in a short amout of time
     * @param {paper.hitOptions} hitOptions The options with which to detect whether mouse down has hit
     *     anything editable
     * @return {boolean} True if there was a hit, false otherwise
     */
    onMouseDown (event, clone, multiselect, doubleClicked, hitOptions) {
        if (event.event.button > 0) return; // only first mouse button
        const {hitResult, mode} = this._determineMode(event, multiselect, hitOptions);
        if (!hitResult) {
            if (!multiselect) {
                this.removeBoundsPath();
            }
            return false;
        }
        this.mode = mode;

        const hitProperties = {
            hitResult: hitResult,
            clone: clone,
            multiselect: multiselect,
            doubleClicked: doubleClicked
        };
        if (this.mode === BoundingBoxModes.MOVE) {
            this._modeMap[this.mode].onMouseDown(hitProperties);
            this.removeBoundsHandles();
        } else if (this.mode === BoundingBoxModes.SCALE) {
            this._modeMap[this.mode].onMouseDown(hitResult, this.boundsPath, getSelectedRootItems());
            this.removeBoundsHandles();
        } else if (this.mode === BoundingBoxModes.ROTATE) {
            this.setCursor(Cursors.GRABBING);
            this._modeMap[this.mode].onMouseDown(hitResult, this.boundsPath, getSelectedRootItems());
            // While transforming, don't show bounds
            this.removeBoundsPath();
        }

        return true;
    }
    onMouseMove (event, hitOptions) {
        this._updateCursor(event, hitOptions);
    }
    _updateCursor (event, hitOptions) {
        const {mode, hitResult} = this._determineMode(event, false, hitOptions);
        if (hitResult) {
            if (mode === BoundingBoxModes.MOVE) {
                this.setCursor(Cursors.DEFAULT);
            } else if (mode === BoundingBoxModes.ROTATE) {
                this.setCursor(Cursors.GRAB);
            } else if (mode === BoundingBoxModes.SCALE) {
                this.setSelectionBounds();
                if (this._impreciseEqual(hitResult.item.position.x, this.boundsPath.position.x)) {
                    this.setCursor(Cursors.RESIZE_NS);
                } else if (this._impreciseEqual(hitResult.item.position.y, this.boundsPath.position.y)) {
                    this.setCursor(Cursors.RESIZE_EW);
                } else if (
                    hitResult.item.position.equals(this.boundsPath.bounds.bottomLeft) ||
                    hitResult.item.position.equals(this.boundsPath.bounds.topRight)
                ) {
                    this.setCursor(Cursors.RESIZE_NESW);
                } else {
                    this.setCursor(Cursors.RESIZE_NWSE);
                }
            }
        } else {
            this.setCursor(Cursors.DEFAULT);
        }
    }
    _impreciseEqual (a, b) {
        // This is the same math paper.js uses to check if two numbers are "equal".
        return Math.abs(a - b) < 1e-8;
    }
    _determineMode (event, multiselect, hitOptions) {
        const hitResults = paper.project.hitTestAll(event.point, hitOptions);

        let mode;

        // Prefer scale to trigger over rotate, and scale and rotate to trigger over other hits
        let hitResult = hitResults[0];
        for (let i = 0; i < hitResults.length; i++) {
            if (hitResults[i].item.data && hitResults[i].item.data.isScaleHandle) {
                hitResult = hitResults[i];
                mode = BoundingBoxModes.SCALE;
                break;
            } else if (hitResults[i].item.data && hitResults[i].item.data.isRotHandle) {
                hitResult = hitResults[i];
                mode = BoundingBoxModes.ROTATE;
            }
        }
        if (!mode) {
            mode = BoundingBoxModes.MOVE;
        }

        return {mode, hitResult};
    }
    onMouseDrag (event) {
        if (event.event.button > 0 || !this.mode) return; // only first mouse button
        this._modeMap[this.mode].onMouseDrag(event);

        // Set the cursor for moving a sprite once the drag has actually started (i.e. the mouse has been moved while
        // pressed), so that the mouse doesn't "flash" to the grabbing cursor every time a sprite is clicked.
        if (this.mode === BoundingBoxModes.MOVE) {
            this.setCursor(Cursors.GRABBING);
        }
    }
    onMouseUp (event, hitOptions) {
        if (event.event.button > 0 || !this.mode) return; // only first mouse button
        this._modeMap[this.mode].onMouseUp(event);

        // After transforming, show bounds again
        this.setSelectionBounds();
        this.mode = null;
        this._updateCursor(event, hitOptions);
    }
    setSelectionBounds () {
        this.removeBoundsPath();

        const items = getSelectedRootItems();
        if (items.length <= 0) return;

        let rect = null;
        for (const item of items) {
            if (item instanceof paper.Raster && item.loaded === false) {
                item.onLoad = this.setSelectionBounds.bind(this);
                return;
            }

            if (rect) {
                rect = rect.unite(item.bounds);
            } else {
                rect = item.bounds;
            }
        }

        if (!this.boundsPath) {
            this.boundsPath = new paper.Path.Rectangle(rect);
            this.boundsPath.curves[0].divideAtTime(0.5);
            this.boundsPath.curves[2].divideAtTime(0.5);
            this.boundsPath.curves[4].divideAtTime(0.5);
            this.boundsPath.curves[6].divideAtTime(0.5);
            this._modeMap[BoundingBoxModes.MOVE].setBoundsPath(this.boundsPath);
        }
        this.boundsPath.guide = true;
        this.boundsPath.data.isSelectionBound = true;
        this.boundsPath.data.isHelperItem = true;
        this.boundsPath.fillColor = null;
        this.boundsPath.parent = getGuideLayer();
        this.boundsPath.strokeWidth = 1 / paper.view.zoom;
        this.boundsPath.strokeColor = getGuideColor();

        // Make a template to copy
        const boundsScaleCircleShadow =
            new paper.Path.Circle({
                center: new paper.Point(0, 0),
                radius: 5.5 / paper.view.zoom,
                fillColor: 'black',
                opacity: .12,
                data: {
                    isHelperItem: true,
                    noSelect: true,
                    noHover: true
                }
            });
        const boundsScaleCircle =
            new paper.Path.Circle({
                center: new paper.Point(0, 0),
                radius: 4 / paper.view.zoom,
                fillColor: getGuideColor(),
                data: {
                    isScaleHandle: true,
                    isHelperItem: true,
                    noSelect: true,
                    noHover: true
                }
            });
        const boundsScaleHandle = new paper.Group([boundsScaleCircleShadow, boundsScaleCircle]);
        boundsScaleHandle.parent = getGuideLayer();

        for (let index = 0; index < this.boundsPath.segments.length; index++) {
            const segment = this.boundsPath.segments[index];

            if (index === 7) {
                const offset = new paper.Point(0, 20);

                const arrows = new paper.Path(ARROW_PATH);
                arrows.translate(segment.point.add(offset).add(-10.5, -5));

                const line = new paper.Path.Rectangle(
                    segment.point.add(offset).subtract(1, 0),
                    segment.point);

                const rotHandle = arrows.unite(line);
                line.remove();
                arrows.remove();
                rotHandle.scale(1 / paper.view.zoom, segment.point);
                rotHandle.data = {
                    offset: offset,
                    isRotHandle: true,
                    isHelperItem: true,
                    noSelect: true,
                    noHover: true
                };
                rotHandle.fillColor = getGuideColor();
                rotHandle.parent = getGuideLayer();
                this.boundsRotHandles[index] = rotHandle;
            }

            this.boundsScaleHandles[index] = boundsScaleHandle.clone();
            this.boundsScaleHandles[index].position = segment.point;
            for (const child of this.boundsScaleHandles[index].children) {
                child.data.index = index;
            }
            this.boundsScaleHandles[index].data = {
                index: index,
                isScaleHandle: true,
                isHelperItem: true,
                noSelect: true,
                noHover: true
            };
        }
        // Remove the template
        boundsScaleHandle.remove();
    }
    removeBoundsPath () {
        removeBoundsPath();
        this.boundsPath = null;
        this.boundsScaleHandles.length = 0;
        this.boundsRotHandles.length = 0;
    }
    removeBoundsHandles () {
        removeBoundsHandles();
        this.boundsScaleHandles.length = 0;
        this.boundsRotHandles.length = 0;
    }
    deactivateTool () {
        this.removeBoundsPath();
        this.setCursor(Cursors.DEFAULT);
    }

    setCursor (cursorString) {
        if (this._currentCursor !== cursorString) {
            this.dispatchSetCursor(cursorString);
            this._currentCursor = cursorString;
        }
    }
}

export default BoundingBoxTool;
