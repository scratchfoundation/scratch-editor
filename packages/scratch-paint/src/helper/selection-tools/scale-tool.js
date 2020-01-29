import paper from '@scratch/paper';
import {getItems} from '../selection';
import {ART_BOARD_WIDTH, ART_BOARD_HEIGHT} from '../view';

/**
 * Tool to handle scaling items by pulling on the handles around the edges of the bounding
 * box when in the bounding box tool.
 */
class ScaleTool {
    /**
     * @param {!function} onUpdateImage A callback to call when the image visibly changes
     */
    constructor (onUpdateImage) {
        this.active = false;
        this.boundsPath = null;
        this.pivot = null;
        this.origPivot = null;
        this.corner = null;
        this.origSize = null;
        this.origCenter = null;
        this.itemGroup = null;
        // Lowest item above all scale items in z index
        this.itemToInsertBelow = null;
        this.lastPoint = null;
        this.onUpdateImage = onUpdateImage;
    }

    /**
     * @param {!paper.HitResult} hitResult Data about the location of the mouse click
     * @param {!object} boundsPath Where the boundaries of the hit item are
     * @param {!Array.<paper.Item>} selectedItems Set of selected paper.Items
     */
    onMouseDown (hitResult, boundsPath, selectedItems) {
        if (this.active) return;
        this.active = true;

        const index = hitResult.item.data.index;
        this.pivot = boundsPath.bounds[this._getOpposingRectCornerNameByIndex(index)].clone();
        this.origPivot = boundsPath.bounds[this._getOpposingRectCornerNameByIndex(index)].clone();
        this.corner = boundsPath.bounds[this._getRectCornerNameByIndex(index)].clone();
        this.selectionAnchor = boundsPath.selectionAnchor;
        this.origSize = this.corner.subtract(this.pivot);
        this.origCenter = boundsPath.bounds.center;
        this.isCorner = this._isCorner(index);
        this.centered = false;
        this.lastSx = 1;
        this.lastSy = 1;
        this.boundsPath = boundsPath;

        // Set itemGroup
        // get item to insert below so that scaled items stay in same z position
        const items = getItems({
            match: function (item) {
                for (const scaleItem of selectedItems) {
                    if (!scaleItem.isBelow(item)) {
                        return false;
                    }
                }
                return true;
            }
        });
        if (items.length > 0) {
            this.itemToInsertBelow = items[0];
        }

        this.itemGroup = new paper.Group(selectedItems);
        this.itemGroup.addChild(boundsPath);
        this.itemGroup.insertBelow(this.itemToInsertBelow);
        this.itemGroup.data.isHelperItem = true;
    }
    onMouseDrag (event) {
        if (!this.active) return;
        const point = event.point;
        point.x = Math.max(0, Math.min(point.x, ART_BOARD_WIDTH));
        point.y = Math.max(0, Math.min(point.y, ART_BOARD_HEIGHT));

        if (!this.lastPoint) this.lastPoint = event.lastPoint;
        const delta = point.subtract(this.lastPoint);
        this.lastPoint = point;

        if (event.modifiers.alt) {
            this.centered = true;
            this.itemGroup.position = this.origCenter;
            this.pivot = this.origCenter;
        } else {
            if (this.centered) {
                // Reset position if we were just in alt
                this.centered = false;
                this.itemGroup.scale(1 / this.lastSx, 1 / this.lastSy, this.pivot);
                if (this.selectionAnchor) {
                    this.selectionAnchor.scale(this.lastSx, this.lastSy);
                }
                this.lastSx = 1;
                this.lastSy = 1;
            }
            this.pivot = this.origPivot;
        }

        this.corner = this.corner.add(delta);
        let size = this.corner.subtract(this.pivot);
        if (event.modifiers.alt) {
            size = size.multiply(2);
        }
        let sx = 1.0;
        let sy = 1.0;
        if (Math.abs(this.origSize.x) > 0.0000001) {
            sx = size.x / this.origSize.x;
        }
        if (Math.abs(this.origSize.y) > 0.0000001) {
            sy = size.y / this.origSize.y;
        }

        if (this.isCorner && !event.modifiers.shift) {
            const signx = sx > 0 ? 1 : -1;
            const signy = sy > 0 ? 1 : -1;
            sx = sy = Math.max(Math.abs(sx), Math.abs(sy));
            sx *= signx;
            sy *= signy;
        }
        this.itemGroup.scale(sx / this.lastSx, sy / this.lastSy, this.pivot);
        if (this.selectionAnchor) {
            this.selectionAnchor.scale(this.lastSx / sx, this.lastSy / sy);
        }
        this.lastSx = sx;
        this.lastSy = sy;
    }
    onMouseUp () {
        if (!this.active) return;
        this.lastPoint = null;

        this.pivot = null;
        this.origPivot = null;
        this.corner = null;
        this.origSize = null;
        this.origCenter = null;
        this.lastSx = 1;
        this.lastSy = 1;
        this.centered = false;

        if (!this.itemGroup) {
            return;
        }
        this.boundsPath.remove();
        this.boundsPath = null;
        
        // mark text items as scaled (for later use on font size calc)
        for (let i = 0; i < this.itemGroup.children.length; i++) {
            const child = this.itemGroup.children[i];
            if (child.data.isPGTextItem) {
                child.data.wasScaled = true;
            }
        }

        if (this.itemToInsertBelow) {
            // No increment step because itemGroup.children is getting depleted
            for (const i = 0; i < this.itemGroup.children.length;) {
                this.itemGroup.children[i].insertBelow(this.itemToInsertBelow);
            }
            this.itemToInsertBelow = null;
        } else if (this.itemGroup.layer) {
            this.itemGroup.layer.addChildren(this.itemGroup.children);
        }
        this.itemGroup.remove();
        
        this.onUpdateImage();
        this.active = false;
    }
    _getRectCornerNameByIndex (index) {
        switch (index) {
        case 0:
            return 'bottomLeft';
        case 1:
            return 'leftCenter';
        case 2:
            return 'topLeft';
        case 3:
            return 'topCenter';
        case 4:
            return 'topRight';
        case 5:
            return 'rightCenter';
        case 6:
            return 'bottomRight';
        case 7:
            return 'bottomCenter';
        }
    }
    _getOpposingRectCornerNameByIndex (index) {
        switch (index) {
        case 0:
            return 'topRight';
        case 1:
            return 'rightCenter';
        case 2:
            return 'bottomRight';
        case 3:
            return 'bottomCenter';
        case 4:
            return 'bottomLeft';
        case 5:
            return 'leftCenter';
        case 6:
            return 'topLeft';
        case 7:
            return 'topCenter';
        }
    }
    _isCorner (index) {
        switch (index) {
        case 0:
        case 2:
        case 4:
        case 6:
            return true;
        default:
            return false;
        }
    }
}

export default ScaleTool;
