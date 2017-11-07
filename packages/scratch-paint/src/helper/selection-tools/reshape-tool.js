import paper from '@scratch/paper';
import log from '../../log/log';
import keyMirror from 'keymirror';

import Modes from '../../modes/modes';
import {getHoveredItem} from '../hover';
import {getRootItem, isPGTextItem} from '../item';
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
        return 8;
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
     * @param {!function} onUpdateSvg A callback to call when the image visibly changes
     */
    constructor (setHoveredItem, clearHoveredItem, setSelectedItems, clearSelectedItems, onUpdateSvg) {
        super();
        this.setHoveredItem = setHoveredItem;
        this.clearHoveredItem = clearHoveredItem;
        this.onUpdateSvg = onUpdateSvg;
        this.prevHoveredItemId = null;
        this.lastEvent = null;
        this.active = false;
        this.mode = ReshapeModes.SELECTION_BOX;
        this._modeMap = {};
        this._modeMap[ReshapeModes.FILL] =
            new MoveTool(Modes.RESHAPE, setSelectedItems, clearSelectedItems, onUpdateSvg);
        this._modeMap[ReshapeModes.POINT] = new PointTool(setSelectedItems, clearSelectedItems, onUpdateSvg);
        this._modeMap[ReshapeModes.HANDLE] = new HandleTool(setSelectedItems, clearSelectedItems, onUpdateSvg);
        this._modeMap[ReshapeModes.SELECTION_BOX] =
            new SelectionBoxTool(Modes.RESHAPE, setSelectedItems, clearSelectedItems);

        // We have to set these functions instead of just declaring them because
        // paper.js tools hook up the listeners in the setter functions.
        this.onMouseDown = this.handleMouseDown;
        this.onMouseMove = this.handleMouseMove;
        this.onMouseDrag = this.handleMouseDrag;
        this.onMouseUp = this.handleMouseUp;

        paper.settings.handleSize = 8;
    }
    /**
     * Returns the hit options to use when conducting hit tests.
     * @param {boolean} preselectedOnly True if we should only return results that are already
     *     selected.
     * @return {object} See paper.Item.hitTest for definition of options
     */
    getHitOptions (preselectedOnly) {
        const hitOptions = {
            segments: true,
            stroke: true,
            curves: true,
            handles: true,
            fill: true,
            guide: false,
            tolerance: ReshapeTool.TOLERANCE / paper.view.zoom
        };
        if (preselectedOnly) {
            hitOptions.match = item => {
                if (!item.item || !item.item.selected) return;
                if (item.type === 'handle-out' || item.type === 'handle-in') {
                    // Only hit test against handles that are visible, that is,
                    // their segment is selected
                    if (!item.segment.selected) {
                        return false;
                    }
                    // If the entire shape is selected, handles are hidden
                    if (item.item.fullySelected) {
                        return false;
                    }
                }
                return true;
            };
        } else {
            hitOptions.match = item => {
                if (item.type === 'handle-out' || item.type === 'handle-in') {
                    // Only hit test against handles that are visible, that is,
                    // their segment is selected
                    if (!item.segment.selected) {
                        return false;
                    }
                    // If the entire shape is selected, handles are hidden
                    if (item.item.fullySelected) {
                        return false;
                    }
                }
                return true;
            };
        }
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

        // Choose hit result to use ===========================================================
        // Prefer hits on already selected items
        let hitResults =
            paper.project.hitTestAll(event.point, this.getHitOptions(true /* preselectedOnly */));
        if (hitResults.length === 0) {
            hitResults = paper.project.hitTestAll(event.point, this.getHitOptions());
        }
        if (hitResults.length === 0) {
            this._modeMap[ReshapeModes.SELECTION_BOX].onMouseDown(event.modifiers.shift);
            return;
        }

        // Prefer hits on segments to other types of hits, to make sure handles are movable.
        let hitResult = hitResults[0];
        for (let i = 0; i < hitResults.length; i++) {
            if (hitResults[i].type === 'segment') {
                hitResult = hitResults[i];
                break;
            }
        }
        
        // Don't allow detail-selection of PGTextItem
        if (isPGTextItem(getRootItem(hitResult.item))) {
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
        // or stroke (since those were invisible), just select the whole thing as if they clicked the fill.
        if (!hitResult.item.selected ||
                hitResult.type === 'fill' ||
                (hitResult.type !== 'segment' && doubleClicked)) {
            this.mode = ReshapeModes.FILL;
            this._modeMap[this.mode].onMouseDown(hitProperties);
        } else if (hitResult.type === 'segment') {
            this.mode = ReshapeModes.POINT;
            this._modeMap[this.mode].onMouseDown(hitProperties);
        } else if (
            hitResult.type === 'stroke' ||
            hitResult.type === 'curve') {
            this.mode = ReshapeModes.POINT;
            this._modeMap[this.mode].addPoint(hitProperties);
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
    
        // @todo Trigger selection changed. Update styles based on selection.
    }
    handleMouseMove (event) {
        const hoveredItem = getHoveredItem(event, this.getHitOptions(), true /* subselect */);
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
        this._modeMap[this.mode].onMouseUp(event);
        this.mode = ReshapeModes.SELECTION_BOX;
        this.active = false;
    }
    deactivateTool () {
        paper.settings.handleSize = 0;
        this.clearHoveredItem();
        this.setHoveredItem = null;
        this.clearHoveredItem = null;
        this.onUpdateSvg = null;
        this.lastEvent = null;
    }
}

export default ReshapeTool;
