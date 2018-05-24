import paper from '@scratch/paper';
import Modes from '../../lib/modes';
import {clearSelection, getSelectedLeafItems} from '../selection';
import BoundingBoxTool from '../selection-tools/bounding-box-tool';
import NudgeTool from '../selection-tools/nudge-tool';
import {hoverBounds} from '../guides';

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
    /** Typing with no pauses longer than this amount of type will count as 1 action */
    static get TYPING_TIMEOUT_MILLIS () {
        return 1000;
    }
    static get TEXT_PADDING () {
        return 8;
    }
    /**
     * @param {HTMLTextAreaElement} textAreaElement dom element for the editable text field
     * @param {function} setSelectedItems Callback to set the set of selected items in the Redux state
     * @param {function} clearSelectedItems Callback to clear the set of selected items in the Redux state
     * @param {!function} onUpdateImage A callback to call when the image visibly changes
     * @param {!function} setTextEditTarget Call to set text editing target whenever text editing is active
     * @param {!function} changeFont Call to change the font in the dropdown
     */
    constructor (textAreaElement, setSelectedItems, clearSelectedItems, onUpdateImage, setTextEditTarget, changeFont) {
        super();
        this.element = textAreaElement;
        this.setSelectedItems = setSelectedItems;
        this.clearSelectedItems = clearSelectedItems;
        this.onUpdateImage = onUpdateImage;
        this.setTextEditTarget = setTextEditTarget;
        this.changeFont = changeFont;
        this.boundingBoxTool = new BoundingBoxTool(Modes.TEXT, setSelectedItems, clearSelectedItems, onUpdateImage);
        this.nudgeTool = new NudgeTool(this.boundingBoxTool, onUpdateImage);
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
        this.lastTypeEvent = null;

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
     * Called when the selection changes to update the bounds of the bounding box.
     * @param {Array<paper.Item>} selectedItems Array of selected items.
     */
    onSelectionChanged (selectedItems) {
        this.boundingBoxTool.onSelectionChanged(selectedItems);
    }
    setFont (font) {
        this.font = font;
        if (this.textBox) {
            this.textBox.font = font;
        }
        const selected = getSelectedLeafItems();
        for (const item of selected) {
            if (item instanceof paper.PointText) {
                item.font = font;
            }
        }
        this.element.style.fontFamily = font;
        this.setSelectedItems();
    }
    // Allow other tools to cancel text edit mode
    onTextEditCancelled () {
        this.endTextEdit();
        if (this.textBox) {
            this.mode = TextTool.SELECT_MODE;
            this.textBox.selected = true;
            this.setSelectedItems();
        }
    }
    /**
     * Called when the view matrix changes
     * @param {paper.Matrix} viewMtx applied to paper.view
     */
    onViewBoundsChanged (viewMtx) {
        if (this.mode !== TextTool.TEXT_EDIT_MODE) {
            return;
        }
        const matrix = this.textBox.matrix;
        this.element.style.transform =
            `translate(0px, ${this.textBox.internalBounds.y}px)
            matrix(${viewMtx.a}, ${viewMtx.b}, ${viewMtx.c}, ${viewMtx.d},
            ${viewMtx.tx}, ${viewMtx.ty})
            matrix(${matrix.a}, ${matrix.b}, ${matrix.c}, ${matrix.d},
            ${matrix.tx}, ${matrix.ty})`;
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

        const lastMode = this.mode;

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
            // Double click in select mode moves you to text edit mode
            clearSelection(this.clearSelectedItems);
            this.textBox = doubleClickHitTest.item;
            this.beginTextEdit(this.textBox.content, this.textBox.matrix);
        } else if (
            this.boundingBoxTool.onMouseDown(
                event, false /* clone */, false /* multiselect */, this.getBoundingBoxHitOptions())) {
            // In select mode staying in select mode
            return;
        }

        // We clicked away from the item, so end the current mode
        if (lastMode === TextTool.SELECT_MODE) {
            clearSelection(this.clearSelectedItems);
            this.mode = null;
        } else if (lastMode === TextTool.TEXT_EDIT_MODE) {
            this.endTextEdit();
        }

        const hitResults = paper.project.hitTestAll(event.point, this.getTextEditHitOptions());
        if (hitResults.length) {
            // Clicking a different text item to begin text edit mode on that item
            clearSelection(this.clearSelectedItems);
            this.textBox = hitResults[0].item;
            this.beginTextEdit(this.textBox.content, this.textBox.matrix);
        } else if (lastMode === TextTool.TEXT_EDIT_MODE) {
            // In text mode clicking away to begin select mode
            if (this.textBox) {
                this.mode = TextTool.SELECT_MODE;
                this.textBox.selected = true;
                this.setSelectedItems();
            }
        } else {
            // In no mode or select mode clicking away to begin text edit mode
            this.textBox = new paper.PointText({
                point: event.point,
                content: '',
                font: this.font,
                fontSize: 40,
                fillColor: this.colorState.fillColor,
                // Default leading for both the HTML text area and paper.PointText
                // is 120%, but for some reason they are slightly off from each other.
                // This value was obtained experimentally.
                leading: 46.15
            });
            this.beginTextEdit(this.textBox.content, this.textBox.matrix);
        }
    }
    handleMouseDrag (event) {
        if (event.event.button > 0 || !this.active) return; // only first mouse button

        if (this.mode === TextTool.SELECT_MODE) {
            this.boundingBoxTool.onMouseDrag(event);
            return;
        }
    }
    handleMouseUp (event) {
        if (event.event.button > 0 || !this.active) return; // only first mouse button
        
        if (this.mode === TextTool.SELECT_MODE) {
            this.boundingBoxTool.onMouseUp(event);
            this.isBoundingBoxMode = null;
            return;
        }

        this.active = false;
    }
    handleKeyUp (event) {
        if (event.event.target instanceof HTMLInputElement) {
            // Ignore nudge if a text input field is focused
            return;
        }

        if (this.mode === TextTool.SELECT_MODE) {
            this.nudgeTool.onKeyUp(event);
        }
    }
    handleKeyDown (event) {
        if (event.event.target instanceof HTMLInputElement) {
            // Ignore nudge if a text input field is focused
            return;
        }
        if (this.mode === TextTool.TEXT_EDIT_MODE && event.key === 'escape') {
            this.endTextEdit();
        }
        if (this.mode === TextTool.SELECT_MODE) {
            this.nudgeTool.onKeyDown(event);
        }
    }
    handleTextInput (event) {
        // Save undo state if you paused typing for long enough.
        if (this.lastTypeEvent && event.timeStamp - this.lastTypeEvent.timeStamp > TextTool.TYPING_TIMEOUT_MILLIS) {
            this.onUpdateImage();
        }
        this.lastTypeEvent = event;
        if (this.mode === TextTool.TEXT_EDIT_MODE) {
            this.textBox.content = this.element.value;
        }
        this.resizeGuide();
    }
    resizeGuide () {
        if (this.guide) this.guide.remove();
        this.guide = hoverBounds(this.textBox, TextTool.TEXT_PADDING);
        this.guide.dashArray = [4, 4];
        // Prevent line from wrapping
        this.element.style.width = `${this.textBox.internalBounds.width + 1}px`;
        this.element.style.height = `${this.textBox.internalBounds.height}px`;
    }
    /**
     * @param {string} initialText Text to initialize the text area with
     * @param {paper.Matrix} matrix Transform matrix for the element. Defaults
     *     to the identity matrix.
     */
    beginTextEdit (initialText, matrix) {
        this.mode = TextTool.TEXT_EDIT_MODE;
        this.setTextEditTarget(this.textBox.id);
        if (this.font !== this.textBox.font) {
            this.changeFont(this.textBox.font);
        }
        this.element.style.fontSize = `${this.textBox.fontSize}px`;
        this.element.style.lineHeight = this.textBox.leading / this.textBox.fontSize;

        const viewMtx = paper.view.matrix;

        this.element.style.display = 'initial';
        this.element.value = initialText ? initialText : '';
        this.element.style.transformOrigin =
            `${-this.textBox.internalBounds.x}px ${-this.textBox.internalBounds.y}px`;
        this.element.style.transform =
            `translate(0px, ${this.textBox.internalBounds.y}px)
            matrix(${viewMtx.a}, ${viewMtx.b}, ${viewMtx.c}, ${viewMtx.d},
            ${viewMtx.tx}, ${viewMtx.ty})
            matrix(${matrix.a}, ${matrix.b}, ${matrix.c}, ${matrix.d},
            ${matrix.tx}, ${matrix.ty})`;
        this.element.focus({preventScroll: true});
        this.eventListener = this.handleTextInput.bind(this);
        this.element.addEventListener('input', this.eventListener);
        this.resizeGuide();
    }
    endTextEdit () {
        if (this.mode !== TextTool.TEXT_EDIT_MODE) {
            return;
        }
        this.mode = null;

        // Remove invisible textboxes
        if (this.textBox && this.textBox.content.trim() === '') {
            this.textBox.remove();
            this.textBox = null;
        }

        // Remove guide
        if (this.guide) {
            this.guide.remove();
            this.guide = null;
            this.setTextEditTarget();
        }
        this.element.style.display = 'none';
        if (this.eventListener) {
            this.element.removeEventListener('input', this.eventListener);
            this.eventListener = null;
        }
        this.lastTypeEvent = null;

        // If you finished editing a textbox, save undo state
        if (this.textBox && this.textBox.content.trim().length) {
            this.onUpdateImage();
        }
    }
    deactivateTool () {
        if (this.textBox && this.textBox.content.trim() === '') {
            this.textBox.remove();
            this.textBox = null;
        }
        this.endTextEdit();
        this.boundingBoxTool.removeBoundsPath();
    }
}

export default TextTool;
