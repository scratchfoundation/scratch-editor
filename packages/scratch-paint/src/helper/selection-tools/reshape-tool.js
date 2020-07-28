import paper from '@scratch/paper';
import log from '../../log/log';
import keyMirror from 'keymirror';

import Modes from '../../lib/modes';
import {isBoundsItem} from '../item';
import {hoverBounds, hoverItem} from '../guides';
import {sortItemsByZIndex} from '../math';
import {getSelectedLeafItems, getSelectedSegments} from '../selection';
import MoveTool from './move-tool';
import PointTool from './point-tool';
import HandleTool from './handle-tool';
import SelectionBoxTool from './selection-box-tool';

/** Modes of the reshape tool, which can do many things depending on how it's used. */
const ReshapeModes = keyMirror({
    FILL: null,
    POINT: null,
    HANDLE: null,
    SELECTION_BOX: null
});

/**
 * paper.Tool to handle reshape mode, which allows manipulation of control points and
 * handles of path items. Can be used to select items within groups and points within items.
 * Reshape is made up of 4 tools:
 * - Selection box tool, which is activated by clicking an empty area. Draws a box and selects
 *   points and curves inside it
 * - Move tool, which translates items
 * - Point tool, which translates, adds and removes points
 * - Handle tool, which translates handles, changing the shape of curves
 */
class ReshapeTool extends paper.Tool {
    /** Distance within which mouse is considered to be hitting an item */
    static get TOLERANCE () {
        return ReshapeTool.HANDLE_RADIUS + ReshapeTool.HANDLE_PADDING;
    }
    /**
     * Units of padding around the visible handle area that will still register clicks as "touching the handle"
     */
    static get HANDLE_PADDING () {
        return 1;
    }
    /**
     * Handles' radius, including the stroke
     */
    static get HANDLE_RADIUS () {
        return 5.25;
    }
    /** Clicks registered within this amount of time are registered as double clicks */
    static get DOUBLE_CLICK_MILLIS () {
        return 250;
    }
    /**
     * @param {function} setHoveredItem Callback to set the hovered item
     * @param {function} clearHoveredItem Callback to clear the hovered item
     * @param {function} setSelectedItems Callback to set the set of selected items in the Redux state
     * @param {function} clearSelectedItems Callback to clear the set of selected items in the Redux state
     * @param {!function} onUpdateImage A callback to call when the image visibly changes
     * @param {!function} switchToTextTool A callback to call to switch to the text tool
     */
    constructor (setHoveredItem, clearHoveredItem, setSelectedItems, clearSelectedItems, onUpdateImage,
        switchToTextTool) {
        super();
        this.setHoveredItem = setHoveredItem;
        this.clearHoveredItem = clearHoveredItem;
        this.onUpdateImage = onUpdateImage;
        this.prevHoveredItemId = null;
        this.lastEvent = null;
        this.active = false;
        this.mode = ReshapeModes.SELECTION_BOX;
        this._modeMap = {};
        this._modeMap[ReshapeModes.FILL] =
            new MoveTool(Modes.RESHAPE, setSelectedItems, clearSelectedItems, onUpdateImage, switchToTextTool);
        this._modeMap[ReshapeModes.POINT] = new PointTool(setSelectedItems, clearSelectedItems, onUpdateImage);
        this._modeMap[ReshapeModes.HANDLE] = new HandleTool(setSelectedItems, clearSelectedItems, onUpdateImage);
        this._modeMap[ReshapeModes.SELECTION_BOX] =
            new SelectionBoxTool(Modes.RESHAPE, setSelectedItems, clearSelectedItems);

        // We have to set these functions instead of just declaring them because
        // paper.js tools hook up the listeners in the setter functions.
        this.onMouseDown = this.handleMouseDown;
        this.onMouseMove = this.handleMouseMove;
        this.onMouseDrag = this.handleMouseDrag;
        this.onMouseUp = this.handleMouseUp;
        this.onKeyUp = this.handleKeyUp;
        this.onKeyDown = this.handleKeyDown;

        // A handle's size is given in diameter, and each handle has a 2.5-pixel stroke that isn't part of its size:
        // https://github.com/LLK/paper.js/blob/a187e4c81cc63f3d48c5097b9a9fbddde9f057da/src/item/Item.js#L4480
        // Size the handles such that clicking on either the stroke or the handle itself will be registered as a drag
        paper.settings.handleSize = (ReshapeTool.HANDLE_RADIUS * 2) - 2.5;
    }
    /**
     * Returns the hit options for segments to use when conducting hit tests. Segments are only visible
     * when the shape is selected. Segments take precedence, since they are always over curves and need
     * to be grabbable. (Segments are the little circles)
     * @return {object} See paper.Item.hitTest for definition of options
     */
    getSelectedSegmentHitOptions () {
        const hitOptions = {
            segments: true,
            tolerance: ReshapeTool.TOLERANCE / paper.view.zoom,
            match: hitResult => {
                if (hitResult.type !== 'segment') return false;
                if (hitResult.item.data && hitResult.item.data.noHover) return false;
                if (!hitResult.item.selected) return false;
                return true;
            }
        };
        return hitOptions;
    }
    /**
     * Returns the hit options for handles to use when conducting hit tests. Handles need to be done
     * separately because we want to ignore hidden handles, but we don't want hidden handles to negate
     * legitimate hits on other things (like if the handle is over part of the fill). (Handles are the diamonds)
     * @return {object} See paper.Item.hitTest for definition of options
     */
    getHandleHitOptions () {
        const hitOptions = {
            handles: true,
            tolerance: ReshapeTool.TOLERANCE / paper.view.zoom,
            match: hitResult => {
                if (hitResult.item.data && hitResult.item.data.noHover) return false;
                // Only hit test against handles that are visible, that is,
                // their segment is selected
                if (!hitResult.segment || !hitResult.segment.selected) return false;
                // If the entire shape is selected, handles are hidden
                if (hitResult.item.fullySelected) return false;
                return true;
            }
        };
        return hitOptions;
    }
    /**
     * Returns the hit options for curves of selected objects, which take precedence over
     * unselected things and fills.
     * @return {object} See paper.Item.hitTest for definition of options
     */
    getSelectedStrokeHitOptions () {
        const hitOptions = {
            segments: false,
            stroke: false,
            curves: true,
            handles: false,
            fill: false,
            guide: false,
            tolerance: ReshapeTool.TOLERANCE / paper.view.zoom,
            match: hitResult => {
                if (hitResult.type !== 'curve') return false;
                if (!hitResult.item.selected) return false;
                if (hitResult.item.data && hitResult.item.data.noHover) return false;
                return true;
            }
        };
        return hitOptions;
    }
    /**
     * Returns the hit options for fills and unselected strokes/curves to use when conducting hit tests.
     * @param {boolean} preselectedOnly True if we should only return results that are already
     *     selected.
     * @return {object} See paper.Item.hitTest for definition of options
     */
    getUnselectedAndFillHitOptions () {
        const hitOptions = {
            fill: true,
            stroke: true,
            curves: true,
            tolerance: ReshapeTool.TOLERANCE / paper.view.zoom,
            match: hitResult => {
                if (hitResult.item.data && hitResult.item.data.noHover) return false;
                return true;
            }
        };
        return hitOptions;
    }
    /**
     * To be called when the hovered item changes. When the select tool hovers over a
     * new item, it compares against this to see if a hover item change event needs to
     * be fired.
     * @param {paper.Item} prevHoveredItemId ID of the highlight item that indicates the mouse is
     *     over a given item currently
     */
    setPrevHoveredItemId (prevHoveredItemId) {
        this.prevHoveredItemId = prevHoveredItemId;
    }
    /**
     * Given the point at which the mouse is, return the prioritized hit result, or null if nothing was hit.
     * @param {paper.Point} point Point to hit test on canvas
     * @return {?paper.HitResult} hitResult
     */
    getHitResult (point) {
        // Prefer hits on segments to other types of hits, since segments always overlap curves.
        let hitResults =
            paper.project.hitTestAll(point, this.getSelectedSegmentHitOptions());
        if (!hitResults.length) {
            hitResults = paper.project.hitTestAll(point, this.getHandleHitOptions());
        }
        if (!hitResults.length) {
            hitResults = paper.project.hitTestAll(point, this.getSelectedStrokeHitOptions());
        }
        if (!hitResults.length) {
            hitResults = paper.project.hitTestAll(point, this.getUnselectedAndFillHitOptions());
        }
        if (!hitResults.length) {
            return null;
        }

        // Get highest z-index result
        let hitResult;
        for (const result of hitResults) {
            if (!hitResult || sortItemsByZIndex(hitResult.item, result.item) < 0) {
                hitResult = result;
            }
        }
        return hitResult;
    }
    handleMouseDown (event) {
        if (event.event.button > 0) return; // only first mouse button
        this.active = true;
        this.clearHoveredItem();

        // Check if double clicked
        let doubleClicked = false;
        if (this.lastEvent) {
            if ((event.event.timeStamp - this.lastEvent.event.timeStamp) < ReshapeTool.DOUBLE_CLICK_MILLIS) {
                doubleClicked = true;
            } else {
                doubleClicked = false;
            }
        }
        this.lastEvent = event;

        const hitResult = this.getHitResult(event.point);
        if (!hitResult) {
            this._modeMap[ReshapeModes.SELECTION_BOX].onMouseDown(event.modifiers.shift);
            return;
        }

        const hitProperties = {
            hitResult: hitResult,
            clone: event.modifiers.alt,
            multiselect: event.modifiers.shift,
            doubleClicked: doubleClicked,
            subselect: true
        };

        // If item is not yet selected, don't behave differently depending on if they clicked a segment
        // (since those were invisible), just select the whole thing as if they clicked the fill.
        if (!hitResult.item.selected ||
                hitResult.type === 'fill' ||
                hitResult.type === 'stroke' ||
                (hitResult.type !== 'segment' && doubleClicked)) {
            this.mode = ReshapeModes.FILL;
            this._modeMap[this.mode].onMouseDown(hitProperties);
        } else if (hitResult.type === 'segment') {
            this.mode = ReshapeModes.POINT;
            this._modeMap[this.mode].onMouseDown(hitProperties);
        } else if (
            hitResult.type === 'curve') {
            this.mode = ReshapeModes.POINT;
            this._modeMap[this.mode].addPoint(hitProperties);
            this.onUpdateImage();
            this._modeMap[this.mode].onMouseDown(hitProperties);
        } else if (
            hitResult.type === 'handle-in' ||
            hitResult.type === 'handle-out') {
            this.mode = ReshapeModes.HANDLE;
            this._modeMap[this.mode].onMouseDown(hitProperties);
        } else {
            log.warn(`Unhandled hit result type: ${hitResult.type}`);
            this.mode = ReshapeModes.FILL;
            this._modeMap[this.mode].onMouseDown(hitProperties);
        }
    }
    handleMouseMove (event) {
        const hitResult = this.getHitResult(event.point);
        let hoveredItem;

        if (hitResult) {
            const item = hitResult.item;
            if (item.selected) {
                hoveredItem = null;
            } else if (isBoundsItem(item)) {
                hoveredItem = hoverBounds(item);
            } else {
                hoveredItem = hoverItem(item);
            }
        }

        if ((!hoveredItem && this.prevHoveredItemId) || // There is no longer a hovered item
                (hoveredItem && !this.prevHoveredItemId) || // There is now a hovered item
                (hoveredItem && this.prevHoveredItemId &&
                    hoveredItem.id !== this.prevHoveredItemId)) { // hovered item changed
            this.setHoveredItem(hoveredItem ? hoveredItem.id : null);
        }
    }
    handleMouseDrag (event) {
        if (event.event.button > 0 || !this.active) return; // only first mouse button
        this._modeMap[this.mode].onMouseDrag(event);
    }
    handleMouseUp (event) {
        if (event.event.button > 0 || !this.active) return; // only first mouse button
        if (this.mode === ReshapeModes.SELECTION_BOX) {
            this._modeMap[this.mode].onMouseUpVector(event);
        } else {
            this._modeMap[this.mode].onMouseUp(event);
        }
        this.mode = ReshapeModes.SELECTION_BOX;
        this.active = false;
    }
    handleKeyDown (event) {
        if (event.event.target instanceof HTMLInputElement) {
            // Ignore nudge if a text input field is focused
            return;
        }

        const nudgeAmount = 1 / paper.view.zoom;
        const selected = getSelectedLeafItems();
        if (selected.length === 0) return;

        let translation;
        if (event.key === 'up') {
            translation = new paper.Point(0, -nudgeAmount);
        } else if (event.key === 'down') {
            translation = new paper.Point(0, nudgeAmount);
        } else if (event.key === 'left') {
            translation = new paper.Point(-nudgeAmount, 0);
        } else if (event.key === 'right') {
            translation = new paper.Point(nudgeAmount, 0);
        }

        if (translation) {
            const segments = getSelectedSegments();
            // If no segments are selected, translate selected paths
            if (segments.length === 0) {
                for (const item of selected) {
                    item.translate(translation);
                }
            } else { // Translate segments
                for (const seg of segments) {
                    seg.point = seg.point.add(translation);
                }
            }
        }
    }
    handleKeyUp (event) {
        const selected = getSelectedLeafItems();
        if (selected.length === 0) return;

        if (event.key === 'up' || event.key === 'down' || event.key === 'left' || event.key === 'right') {
            this.onUpdateImage();
        }
    }
    deactivateTool () {
        paper.settings.handleSize = 0;
        this.clearHoveredItem();
        this.setHoveredItem = null;
        this.clearHoveredItem = null;
        this.onUpdateImage = null;
        this.lastEvent = null;
    }
}

export default ReshapeTool;
