import paper from '@scratch/paper';

/**
 * Tool to handle rotation when dragging the rotation handle in the bounding box tool.
 */
class RotateTool {
    /**
     * @param {!Function} onUpdateImage A callback to call when the image visibly changes
     */
    constructor (onUpdateImage) {
        this.rotItems = [];
        this.rotGroupPivot = null;
        this.prevRot = 90;
        this.onUpdateImage = onUpdateImage;
    }

    /**
     * @param {!paper.HitResult} hitResult Data about the location of the mouse click
     * @param {!object} boundsPath Where the boundaries of the hit item are
     * @param {!Array.<paper.Item>} selectedItems Set of selected paper.Items
     */
    onMouseDown (hitResult, boundsPath, selectedItems) {
        this.rotGroupPivot = boundsPath.bounds.center;
        for (const item of selectedItems) {
            // Rotate only root items
            if (item.parent instanceof paper.Layer) {
                this.rotItems.push(item);
            }
        }
        this.prevRot = 90;
    }
    onMouseDrag (event) {
        let rotAngle = (event.point.subtract(this.rotGroupPivot)).angle;
        if (event.modifiers.shift) {
            rotAngle = Math.round(rotAngle / 45) * 45;
        }

        for (let i = 0; i < this.rotItems.length; i++) {
            const item = this.rotItems[i];

            item.rotate(rotAngle - this.prevRot, this.rotGroupPivot);
        }

        this.prevRot = rotAngle;
    }
    onMouseUp (event) {
        if (event.event.button > 0) return; // only first mouse button

        this.rotItems.length = 0;
        this.rotGroupPivot = null;
        this.prevRot = 90;

        this.onUpdateImage();
    }
}

export default RotateTool;
