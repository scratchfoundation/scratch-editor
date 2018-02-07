import {getSelectedRootItems} from '../selection';
import paper from '@scratch/paper';

/**
 * Tool containing handlers for arrow key events for nudging the selection.
 * Note that this tool is built for selection mode, not reshape mode.
 */
class NudgeTool {
    /**
     * @param {function} boundingBoxTool to control the bounding box
     * @param {!function} onUpdateSvg A callback to call when the image visibly changes
     */
    constructor (boundingBoxTool, onUpdateSvg) {
        this.boundingBoxTool = boundingBoxTool;
        this.onUpdateSvg = onUpdateSvg;
    }
    onKeyDown (event) {
        if (event.event.target instanceof HTMLInputElement) {
            // Ignore nudge if a text input field is focused
            return;
        }

        const nudgeAmount = 1 / paper.view.zoom;
        const selected = getSelectedRootItems();
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
            for (const item of selected) {
                item.translate(translation);
            }
            this.boundingBoxTool.setSelectionBounds();
        }
    }
    onKeyUp (event) {
        const selected = getSelectedRootItems();
        if (selected.length === 0) return;

        if (event.key === 'up' || event.key === 'down' || event.key === 'left' || event.key === 'right') {
            this.onUpdateSvg();
        }
    }
}

export default NudgeTool;
