import paper from '@scratch/paper';
import Modes from '../../lib/modes';
import {styleShape} from '../style-path';
import {clearSelection} from '../selection';
import BoundingBoxTool from '../selection-tools/bounding-box-tool';
import NudgeTool from '../selection-tools/nudge-tool';

/**
 * Tool for adding text. Text elements have limited editability; they can't be reshaped,
 * drawn on or erased. This way they can preserve their ability to have the text edited.
 */
class TextTool extends paper.Tool {
    static get TOLERANCE () {
        return 6;
    }
    static get TEXT_EDIT_MODE () {
        return 'TEXT_EDIT_MODE';
    }
    static get SELECT_MODE () {
        return 'SELECT_MODE';
    }
    /** Clicks registered within this amount of time are registered as double clicks */
    static get DOUBLE_CLICK_MILLIS () {
        return 250;
    }
    /**
     * @param {function} setSelectedItems Callback to set the set of selected items in the Redux state
     * @param {function} clearSelectedItems Callback to clear the set of selected items in the Redux state
     * @param {!function} onUpdateSvg A callback to call when the image visibly changes
     */
    constructor (setSelectedItems, clearSelectedItems, onUpdateSvg) {
        super();
        this.setSelectedItems = setSelectedItems;
        this.clearSelectedItems = clearSelectedItems;
        this.onUpdateSvg = onUpdateSvg;
        this.boundingBoxTool = new BoundingBoxTool(Modes.TEXT, setSelectedItems, clearSelectedItems, onUpdateSvg);
        this.nudgeTool = new NudgeTool(this.boundingBoxTool, onUpdateSvg);
        this.lastEvent = null;
        
        // We have to set these functions instead of just declaring them because
        // paper.js tools hook up the listeners in the setter functions.
        this.onMouseDown = this.handleMouseDown;
        this.onMouseDrag = this.handleMouseDrag;
        this.onMouseUp = this.handleMouseUp;
        this.onMouseMove = this.handleMouseMove;
        this.onKeyUp = this.handleKeyUp;
        this.onKeyDown = this.handleKeyDown;

        this.textBox = null;
        this.guide = null;
        this.colorState = null;
        this.mode = null;
        this.active = false;

        // If text selected and then activate this tool, switch to text edit mode for that text
        // If double click on text while in select mode, does mode change to text mode? Text fully selected by default
    }
    getBoundingBoxHitOptions () {
        return {
            segments: true,
            stroke: true,
            curves: true,
            fill: true,
            guide: false,
            match: hitResult =>
                (hitResult.item.data && hitResult.item.data.isHelperItem) ||
                hitResult.item.selected, // Allow hits on bounding box and selected only
            tolerance: TextTool.TOLERANCE / paper.view.zoom
        };
    }
    getTextEditHitOptions () {
        return {
            class: paper.PointText,
            segments: true,
            stroke: true,
            curves: true,
            fill: true,
            guide: false,
            match: hitResult => hitResult.item && !hitResult.item.selected, // Unselected only
            tolerance: TextTool.TOLERANCE / paper.view.zoom
        };
    }
    /**
     * Should be called if the selection changes to update the bounds of the bounding box.
     * @param {Array<paper.Item>} selectedItems Array of selected items.
     */
    onSelectionChanged (selectedItems) {
        this.boundingBoxTool.onSelectionChanged(selectedItems);
    }
    setColorState (colorState) {
        this.colorState = colorState;
    }
    handleMouseMove (event) {
        const hitResults = paper.project.hitTestAll(event.point, this.getTextEditHitOptions());
        if (hitResults.length) {
            document.body.style.cursor = 'text';
        } else {
            document.body.style.cursor = 'auto';
        }
    }
    handleMouseDown (event) {
        if (event.event.button > 0) return; // only first mouse button
        this.active = true;

        if (this.textBox && this.textBox.content.trim() === '') {
            this.textBox.remove();
            this.textBox = null;
        }

        // Check if double clicked
        let doubleClicked = false;
        if (this.lastEvent) {
            if ((event.event.timeStamp - this.lastEvent.event.timeStamp) < TextTool.DOUBLE_CLICK_MILLIS) {
                doubleClicked = true;
            } else {
                doubleClicked = false;
            }
        }
        this.lastEvent = event;

        const doubleClickHitTest = paper.project.hitTest(event.point, this.getBoundingBoxHitOptions());
        if (doubleClicked &&
                this.mode === TextTool.SELECT_MODE &&
                doubleClickHitTest) {
            clearSelection(this.clearSelectedItems);
            this.textBox = doubleClickHitTest.item;
            this.mode = TextTool.TEXT_EDIT_MODE;
        } else if (this.boundingBoxTool.onMouseDown(
                event, false /* clone */, false /* multiselect */, this.getBoundingBoxHitOptions())) {
            // In select mode staying in select mode
            this.mode = TextTool.SELECT_MODE;
        } else {
            clearSelection(this.clearSelectedItems);
            const hitResults = paper.project.hitTestAll(event.point, this.getTextEditHitOptions());
            if (hitResults.length) {
                // Clicking a text item to begin text edit mode on that item
                this.textBox = hitResults[0].item;
                this.mode = TextTool.TEXT_EDIT_MODE;
            } else if (this.mode === TextTool.TEXT_EDIT_MODE) {
                // In text mode clicking away to begin select mode
                this.mode = TextTool.SELECT_MODE;
                // this.guide.reomve();
                this.textBox.selected = true;
                this.setSelectedItems();
            } else {
                // In no mode or select mode clicking away to begin text edit mode
                this.mode = TextTool.TEXT_EDIT_MODE;
                clearSelection(this.clearSelectedItems);
                this.textBox = new paper.PointText({
                    point: event.point,
                    content: 'لوحة المفاتKeyboardيح العربية',
                    font: 'Times',
                    fontSize: 30
                });
                styleShape(this.textBox, this.colorState);
            }
        }
    }
    handleMouseDrag (event) {
        if (event.event.button > 0 || !this.active) return; // only first mouse button

        if (this.mode === TextTool.SELECT_MODE) {
            this.boundingBoxTool.onMouseDrag(event);
            return;
        }

        // TODO selection
        
    }
    handleMouseUp (event) {
        if (event.event.button > 0 || !this.active) return; // only first mouse button
        
        if (this.mode === TextTool.SELECT_MODE) {
            this.boundingBoxTool.onMouseUp(event);
            this.isBoundingBoxMode = null;
            return;
        }

        // TODO
        this.active = false;
    }
    handleKeyUp (event) {
        if (this.mode === TextTool.SELECT_MODEe) {
            this.nudgeTool.onKeyUp(event);
        }
    }
    handleKeyDown (event) {
        if (this.mode === TextTool.SELECT_MODE) {
            this.nudgeTool.onKeyUp(event);
        } else if (this.mode === TextTool.TEXT_EDIT_MODE) {
            if ((event.key === 'delete' || event.key === 'backspace') && this.textBox.content.length) {
                this.textBox.content = this.textBox.content.slice(0, this.textBox.content.length - 1);
            } else if (!(event.modifiers.alt || event.modifiers.comand || event.modifiers.control ||
                    event.modifiers.meta || event.modifiers.option)) {
                this.textBox.content = this.textBox.content + event.character;
            }
        }
    }
    deactivateTool () {
        this.boundingBoxTool.removeBoundsPath();
        if (this.textBox && this.textBox.content.trim() === '') {
            this.textBox.remove();
            this.textBox = null;
        }
    }
}

export default TextTool;
