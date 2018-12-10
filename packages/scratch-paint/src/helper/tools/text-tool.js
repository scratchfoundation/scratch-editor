import paper from '@scratch/paper';
import Modes from '../../lib/modes';
import {clearSelection, getSelectedLeafItems} from '../selection';
import BoundingBoxTool from '../selection-tools/bounding-box-tool';
import NudgeTool from '../selection-tools/nudge-tool';
import {hoverBounds} from '../guides';
import {getRaster} from '../layer';

/**
 * Tool for adding text. Text elements have limited editability; they can't be reshaped,
 * drawn on or erased. This way they can preserve their ability to have the text edited.
 */
class TextTool extends paper.Tool {
    static get TOLERANCE () {
        return 2;
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
     * @param {function} setCursor Callback to set the visible mouse cursor
     * @param {!function} onUpdateImage A callback to call when the image visibly changes
     * @param {!function} setTextEditTarget Call to set text editing target whenever text editing is active
     * @param {!function} changeFont Call to change the font in the dropdown
     * @param {?boolean} isBitmap True if text should be rasterized once it's deselected
     */
    constructor (textAreaElement, setSelectedItems, clearSelectedItems, setCursor, onUpdateImage, setTextEditTarget,
        changeFont, isBitmap) {
        super();
        this.element = textAreaElement;
        this.setSelectedItems = setSelectedItems;
        this.clearSelectedItems = clearSelectedItems;
        this.onUpdateImage = onUpdateImage;
        this.setTextEditTarget = setTextEditTarget;
        this.changeFont = changeFont;
        this.boundingBoxTool = new BoundingBoxTool(
            Modes.TEXT,
            setSelectedItems,
            clearSelectedItems,
            setCursor,
            onUpdateImage
        );
        this.nudgeTool = new NudgeTool(this.boundingBoxTool, onUpdateImage);
        this.isBitmap = isBitmap;

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
        this.lastEvent = null;

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
                (hitResult.item.data && (hitResult.item.data.isScaleHandle || hitResult.item.data.isRotHandle)) ||
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
            match: hitResult => hitResult.item &&
                !(hitResult.item.data && hitResult.item.data.isHelperItem) &&
                !hitResult.item.selected, // Unselected only
            tolerance: TextTool.TOLERANCE / paper.view.zoom
        };
    }
    /**
     * Called when the selection changes to update the bounds of the bounding box.
     * @param {Array<paper.Item>} selectedItems Array of selected items.
     */
    onSelectionChanged (selectedItems) {
        this.boundingBoxTool.onSelectionChanged(selectedItems);
        if ((!this.textBox || !this.textBox.parent) &&
                selectedItems && selectedItems.length === 1 && selectedItems[0] instanceof paper.PointText) {
            // Infer that an undo occurred and get back the active text
            this.textBox = selectedItems[0];
            this.mode = TextTool.SELECT_MODE;
        }
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
        if (this.mode !== TextTool.TEXT_EDIT_MODE) {
            return;
        }
        this.endTextEdit();
        this.beginSelect();
    }
    /**
     * Called when the view matrix changes
     * @param {paper.Matrix} viewMtx applied to paper.view
     */
    onViewBoundsChanged (viewMtx) {
        if (this.mode !== TextTool.TEXT_EDIT_MODE) {
            return;
        }
        this.calculateMatrix(viewMtx);
    }
    calculateMatrix (viewMtx) {
        const textBoxMtx = this.textBox.matrix;
        const calculated = new paper.Matrix();

        // In RTL, the element is moved relative to its parent's right edge instead of its left
        // edge. We need to correct for this in order for the element to overlap the object in paper.
        let tx = 0;
        if (this.rtl && this.element.parentElement) {
            tx = -this.element.parentElement.clientWidth;
        }
        // The transform origin in paper is x at justification side, y at the baseline of the text.
        // The offset from (0, 0) to the upper left corner is recorded by internalBounds
        // (so this.textBox.internalBounds.y is negative).
        // Move the transform origin down to the text baseline to match paper
        this.element.style.transformOrigin = `${-this.textBox.internalBounds.x}px ${-this.textBox.internalBounds.y}px`;
        // Start by translating the element up so that its (0, 0) is now at the text baseline, like in paper
        calculated.translate(tx, this.textBox.internalBounds.y);
        calculated.append(viewMtx);
        calculated.append(textBoxMtx);
        this.element.style.transform = `matrix(${calculated.a}, ${calculated.b}, ${calculated.c}, ${calculated.d},
             ${calculated.tx}, ${calculated.ty})`;
    }
    setColorState (colorState) {
        this.colorState = colorState;
    }
    /** @param {boolean} isRtl True if paint editor is in right-to-left layout (e.g. Hebrew language) */
    setRtl (isRtl) {
        this.rtl = isRtl;
    }
    handleMouseMove (event) {
        const hitResults = paper.project.hitTestAll(event.point, this.getTextEditHitOptions());
        if (hitResults.length) {
            document.body.style.cursor = 'text';
        } else {
            document.body.style.cursor = 'auto';
        }
        this.boundingBoxTool.onMouseMove(event, this.getBoundingBoxHitOptions());
    }
    handleMouseDown (event) {
        if (event.event.button > 0) return; // only first mouse button
        this.active = true;

        // Check if double clicked
        const doubleClicked = this.lastEvent &&
            (event.event.timeStamp - this.lastEvent.event.timeStamp) < TextTool.DOUBLE_CLICK_MILLIS;
        this.lastEvent = event;
        if (doubleClicked &&
                this.mode === TextTool.SELECT_MODE &&
                this.textBox.hitTest(event.point)) {
            // Double click in select mode moves you to text edit mode
            this.endSelect();
            this.beginTextEdit(this.textBox);
            this.element.select();
            return;
        }

        // In select mode staying in select mode
        if (this.boundingBoxTool.onMouseDown(
            event, false /* clone */, false /* multiselect */, false /* doubleClicked */,
            this.getBoundingBoxHitOptions())) {
            return;
        }

        // We clicked away from the item, so end the current mode
        const lastMode = this.mode;
        if (this.mode === TextTool.SELECT_MODE) {
            this.endSelect();
            if (this.isBitmap) {
                this.commitText();
            }
        } else if (this.mode === TextTool.TEXT_EDIT_MODE) {
            this.endTextEdit();
        }

        const hitResults = paper.project.hitTestAll(event.point, this.getTextEditHitOptions());
        if (hitResults.length) {
            // Clicking a different text item to begin text edit mode on that item
            this.beginTextEdit(hitResults[0].item);
        } else if (lastMode === TextTool.TEXT_EDIT_MODE) {
            // In text mode clicking away to begin select mode
            this.beginSelect();
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
            this.beginTextEdit(this.textBox);
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
            // Select the textbox so that it will be selected if the user performs undo.
            this.textBox.selected = true;
            this.onUpdateImage();
            this.textBox.selected = false;
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
        // The transform origin needs to be updated in RTL because this.textBox.internalBounds.x
        // changes as you type
        if (this.rtl) {
            this.element.style.transformOrigin =
                `${-this.textBox.internalBounds.x}px ${-this.textBox.internalBounds.y}px`;
        }
    }
    beginSelect () {
        if (this.textBox) {
            this.mode = TextTool.SELECT_MODE;
            this.textBox.selected = true;
            this.setSelectedItems();
        }
    }
    endSelect () {
        clearSelection(this.clearSelectedItems);
        this.mode = null;
    }
    /**
     * @param {paper.PointText} textBox Text object to begin text edit on
     */
    beginTextEdit (textBox) {
        this.textBox = textBox;
        this.mode = TextTool.TEXT_EDIT_MODE;
        this.setTextEditTarget(this.textBox.id);
        if (this.font !== this.textBox.font) {
            this.changeFont(this.textBox.font);
        }
        this.element.style.fontSize = `${this.textBox.fontSize}px`;
        this.element.style.lineHeight = this.textBox.leading / this.textBox.fontSize;

        this.element.style.display = 'initial';
        this.element.value = textBox.content ? textBox.content : '';
        this.calculateMatrix(paper.view.matrix);

        if (this.rtl) {
            // make both the textbox and the textarea element grow to the left
            this.textBox.justification = 'right';
        } else {
            this.textBox.justification = 'left';
        }

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
        if (this.textBox && this.lastTypeEvent) {
            // Finished editing a textbox, save undo state
            // Select the textbox so that it will be selected if the user performs undo.
            this.textBox.selected = true;
            this.onUpdateImage();
            this.textBox.selected = false;
            this.lastTypeEvent = null;
        }
    }
    commitText () {
        if (!this.textBox || !this.textBox.parent) return;

        // @todo get crisp text https://github.com/LLK/scratch-paint/issues/508
        const textRaster = this.textBox.rasterize(72, false /* insert */, this.textBox.drawnBounds);
        this.textBox.remove();
        this.textBox = null;
        getRaster().drawImage(
            textRaster.canvas,
            new paper.Point(Math.floor(textRaster.bounds.x), Math.floor(textRaster.bounds.y))
        );
        this.onUpdateImage();
    }
    deactivateTool () {
        if (this.textBox && this.textBox.content.trim() === '') {
            this.textBox.remove();
            this.textBox = null;
        }
        this.endTextEdit();
        if (this.isBitmap) {
            this.commitText();
        }
        this.boundingBoxTool.deactivateTool();
    }
}

export default TextTool;
