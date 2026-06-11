import paper from '@scratch/paper';
import {getSelectedRootItems} from '../selection';
import {getActionBounds} from '../view';
import {BitmapModes} from '../../lib/modes';

const NUDGE_MORE_MULTIPLIER = 15;

/**
 * Tool containing handlers for arrow key events for nudging the selection.
 * Note that this tool is built for selection mode, not reshape mode.
 */
class NudgeTool {
    /**
     * @param {Mode} mode Paint editor mode
     * @param {function} boundingBoxTool to control the bounding box
     * @param {!Function} onUpdateImage A callback to call when the image visibly changes
     */
    constructor (mode, boundingBoxTool, onUpdateImage) {
        this.boundingBoxTool = boundingBoxTool;
        this.onUpdateImage = onUpdateImage;
        this.boundingBoxTool.isBitmap = mode in BitmapModes;
    }
    onKeyDown (event) {
        if (event.event.target instanceof HTMLInputElement) {
            // Ignore nudge if a text input field is focused
            return;
        }

        let nudgeAmount = 1 / paper.view.zoom;
        if (event.modifiers.shift) nudgeAmount *= NUDGE_MORE_MULTIPLIER;

        const selected = getSelectedRootItems();
        if (selected.length === 0) return;

        // Get bounds. Don't let item bounds go out of bounds.
        let rect;
        for (const item of selected) {
            if (rect) {
                rect = rect.unite(item.bounds);
            } else {
                rect = item.bounds;
            }
        }
        const bounds = getActionBounds(this.boundingBoxTool.isBitmap);
        const bottom = bounds.bottom - rect.top - 1;
        const top = bounds.top - rect.bottom + 1;
        const left = bounds.left - rect.right + 1;
        const right = bounds.right - rect.left - 1;

        let translation;
        if (event.key === 'up') {
            translation = new paper.Point(0, Math.min(bottom, Math.max(-nudgeAmount, top)));
        } else if (event.key === 'down') {
            translation = new paper.Point(0, Math.max(top, Math.min(nudgeAmount, bottom)));
        } else if (event.key === 'left') {
            translation = new paper.Point(Math.min(right, Math.max(-nudgeAmount, left)), 0);
        } else if (event.key === 'right') {
            translation = new paper.Point(Math.max(left, Math.min(nudgeAmount, right)), 0);
        }

        if (translation) {
            for (const item of selected) {
                item.translate(translation);
            }
            this.boundingBoxTool.setSelectionBounds();
            event.preventDefault();
        }
    }
    onKeyUp (event) {
        const selected = getSelectedRootItems();
        if (selected.length === 0) return;

        if (event.key === 'up' || event.key === 'down' || event.key === 'left' || event.key === 'right') {
            this.onUpdateImage();
        }
    }
}

export default NudgeTool;
