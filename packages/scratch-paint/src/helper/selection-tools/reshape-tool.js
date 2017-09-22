import paper from 'paper';
import log from '../../log/log';
import keyMirror from 'keymirror';

import Modes from '../../modes/modes';
import {getHoveredItem} from '../hover';
import {deleteSelection} from '../selection';
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

class ReshapeTool extends paper.Tool {
    static get TOLERANCE () {
        return 8;
    }
    static get DOUBLE_CLICK_MILLIS () {
        return 250;
    }
    constructor (setHoveredItem, clearHoveredItem, onUpdateSvg) {
        super();
        this.setHoveredItem = setHoveredItem;
        this.clearHoveredItem = clearHoveredItem;
        this.onUpdateSvg = onUpdateSvg;
        this.prevHoveredItem = null;
        this.lastEvent = null;
        this.mode = ReshapeModes.SELECTION_BOX;
        this.selectionRect = null;
        this._modeMap = {};
        this._modeMap[ReshapeModes.FILL] = new MoveTool(onUpdateSvg);
        this._modeMap[ReshapeModes.POINT] = new PointTool(onUpdateSvg);
        this._modeMap[ReshapeModes.HANDLE] = new HandleTool(onUpdateSvg);
        this._modeMap[ReshapeModes.SELECTION_BOX] = new SelectionBoxTool(Modes.RESHAPE);

        // We have to set these functions instead of just declaring them because
        // paper.js tools hook up the listeners in the setter functions.
        this.onMouseDown = this.handleMouseDown;
        this.onMouseMove = this.handleMouseMove;
        this.onMouseDrag = this.handleMouseDrag;
        this.onMouseUp = this.handleMouseUp;
        this.onKeyUp = this.handleKeyUp;

        paper.settings.handleSize = 8;
    }
    getHitOptions (preselectedOnly) {
        const hitOptions = {
            segments: true,
            stroke: true,
            curves: true,
            handles: true,
            fill: true,
            guide: false
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
                }
                return true;
            };
        }
        return hitOptions;
    }
    setPrevHoveredItem (prevHoveredItem) {
        this.prevHoveredItem = prevHoveredItem;
    }
    handleMouseDown (event) {
        if (event.event.button > 0) return; // only first mouse button
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

        // Choose hit result ===========================================================
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
        if ((!hoveredItem && this.prevHoveredItem) || // There is no longer a hovered item
                (hoveredItem && !this.prevHoveredItem) || // There is now a hovered item
                (hoveredItem && this.prevHoveredItem &&
                    hoveredItem.id !== this.prevHoveredItem.id)) { // hovered item changed
            this.setHoveredItem(hoveredItem);
        }
    }
    handleMouseDrag (event) {
        if (event.event.button > 0) return; // only first mouse button
        this._modeMap[this.mode].onMouseDrag(event);
    }
    handleMouseUp (event) {
        if (event.event.button > 0) return; // only first mouse button
        this._modeMap[this.mode].onMouseUp(event);
        this.mode = ReshapeModes.SELECTION_BOX;
    }
    handleKeyUp (event) {
        // Backspace, delete
        if (event.key === 'delete' || event.key === 'backspace') {
            deleteSelection(Modes.RESHAPE);
            this.onUpdateSvg();
        }
    }
    deactivateTool() {
        paper.settings.handleSize = 0;
        this.clearHoveredItem();
    }
}

export default ReshapeTool;
