import Modes from '../../modes/modes';

import {getHoveredItem} from '../hover';
import {deleteSelection, selectRootItem} from '../selection';
import BoundingBoxTool from './bounding-box-tool';
import SelectionBoxTool from './selection-box-tool';
import paper from 'paper';

class SelectTool extends paper.Tool {
    static get TOLERANCE () {
        return 6;
    }
    constructor (setHoveredItem, clearHoveredItem, onUpdateSvg) {
        super();
        this.setHoveredItem = setHoveredItem;
        this.clearHoveredItem = clearHoveredItem;
        this.onUpdateSvg = onUpdateSvg;
        this.boundingBoxTool = new BoundingBoxTool(onUpdateSvg);
        this.selectionBoxTool = new SelectionBoxTool(Modes.SELECT);
        this.selectionBoxMode = false;
        this._hitOptions = {
            segments: true,
            stroke: true,
            curves: true,
            fill: true,
            guide: false
        };
        
        // We have to set these functions instead of just declaring them because
        // paper.js tools hook up the listeners in the setter functions.
        this.onMouseDown = this.handleMouseDown;
        this.onMouseMove = this.handleMouseMove;
        this.onMouseDrag = this.handleMouseDrag;
        this.onMouseUp = this.handleMouseUp;
        this.onKeyUp = this.handleKeyUp;

        selectRootItem();
        this.boundingBoxTool.setSelectionBounds();
    }
    setPrevHoveredItem (prevHoveredItem) {
        this.prevHoveredItem = prevHoveredItem;
    }
    getHitOptions (preselectedOnly) {
        this._hitOptions.tolerance = SelectTool.TOLERANCE / paper.view.zoom;
        if (preselectedOnly) {
            this._hitOptions.selected = true;
        } else {
            delete this._hitOptions.selected;
        }
        return this._hitOptions;
    }
    handleMouseDown (event) {
        if (event.event.button > 0) return; // only first mouse button

        this.clearHoveredItem();
        if (!this.boundingBoxTool
            .onMouseDown(
                event,
                event.modifiers.alt,
                event.modifiers.shift,
                this.getHitOptions(false /* preseelectedOnly */))) {
            this.selectionBoxMode = true;
            this.selectionBoxTool.onMouseDown(event.modifiers.shift);
        }
    }
    handleMouseMove (event) {
        const hoveredItem = getHoveredItem(event, this.getHitOptions());
        if ((!hoveredItem && this.prevHoveredItem) || // There is no longer a hovered item
                (hoveredItem && !this.prevHoveredItem) || // There is now a hovered item
                (hoveredItem && this.prevHoveredItem &&
                    hoveredItem.id !== this.prevHoveredItem.id)) { // hovered item changed
            this.setHoveredItem(hoveredItem);
        }
    }
    handleMouseDrag (event) {
        if (event.event.button > 0) return; // only first mouse button

        if (this.selectionBoxMode) {
            this.selectionBoxTool.onMouseDrag(event);
        } else {
            this.boundingBoxTool.onMouseDrag(event);
        }
    }
    handleMouseUp (event) {
        if (event.event.button > 0) return; // only first mouse button

        if (this.selectionBoxMode) {
            this.selectionBoxTool.onMouseUp(event);
            this.boundingBoxTool.setSelectionBounds();
        } else {
            this.boundingBoxTool.onMouseUp(event);
        }
        this.selectionBoxMode = false;
    }
    handleKeyUp (event) {
        // Backspace, delete
        if (event.key === 'delete' || event.key === 'backspace') {
            deleteSelection(Modes.SELECT);
            this.onUpdateSvg();
        }
    }
    deactivateTool () {
        this.clearHoveredItem();
        this.boundingBoxTool.removeBoundsPath();
    }
}

export default SelectTool;
