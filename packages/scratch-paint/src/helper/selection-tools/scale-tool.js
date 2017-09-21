import paper from 'paper';

class ScaleTool {
    /**
     * @param {!function} onUpdateSvg A callback to call when the image visibly changes
     */
    constructor (onUpdateSvg) {
        this.pivot = null;
        this.origPivot = null;
        this.corner = null;
        this.origSize = null;
        this.origCenter = null;
        this.itemGroup = null;
        this.boundsPath = null;
        // Lowest item above all scale items in z index
        this.itemToInsertBelow = null;
        this.scaleItems = [];
        this.boundsScaleHandles = [];
        this.boundsRotHandles = [];
        this.onUpdateSvg = onUpdateSvg;
    }

    /**
     * @param {!paper.HitResult} hitResult Data about the location of the mouse click
     * @param {!object} boundsPath Where the boundaries of the hit item are
     * @param {!object} boundsScaleHandles Bounding box scale handles
     * @param {!object} boundsRotHandles Bounding box rotation handle
     * @param {!Array.<paper.Item>} selectedItems Set of selected paper.Items
     * @param {boolean} clone Whether to clone on mouse down (e.g. alt key held)
     * @param {boolean} multiselect Whether to multiselect on mouse down (e.g. shift key held)
     */
    onMouseDown (hitResult, boundsPath, boundsScaleHandles, boundsRotHandles, selectedItems) {
        const index = hitResult.item.data.index;
        this.boundsPath = boundsPath;
        this.boundsScaleHandles = boundsScaleHandles;
        this.boundsRotHandles = boundsRotHandles;
        this.pivot = this.boundsPath.bounds[this.getOpposingRectCornerNameByIndex(index)].clone();
        this.origPivot = this.boundsPath.bounds[this.getOpposingRectCornerNameByIndex(index)].clone();
        this.corner = this.boundsPath.bounds[this.getRectCornerNameByIndex(index)].clone();
        this.origSize = this.corner.subtract(this.pivot);
        this.origCenter = this.boundsPath.bounds.center;
        for (const item of selectedItems) {
            // Scale only root items
            if (item.parent instanceof paper.Layer) {
                this.scaleItems.push(item);
            }
        }
    }
    onMouseDrag (event) {
        const scaleTool = this;
        const modOrigSize = this.origSize;

        // get item to insert below so that scaled items stay in same z position
        const items = paper.project.getItems({
            match: function (item) {
                if (item instanceof paper.Layer || item.data.isHelperItem) {
                    return false;
                }
                for (const scaleItem of scaleTool.scaleItems) {
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

        this.itemGroup = new paper.Group(this.scaleItems);
        this.itemGroup.insertBelow(this.itemToInsertBelow);
        this.itemGroup.addChild(this.boundsPath);
        this.itemGroup.data.isHelperItem = true;
        this.itemGroup.strokeScaling = false;
        this.itemGroup.applyMatrix = false;

        if (event.modifiers.alt) {
            this.pivot = this.origCenter;
            this.modOrigSize = this.origSize * 0.5;
        } else {
            this.pivot = this.origPivot;
        }

        this.corner = this.corner.add(event.delta);
        const size = this.corner.subtract(this.pivot);
        let sx = 1.0;
        let sy = 1.0;
        if (Math.abs(modOrigSize.x) > 0.0000001) {
            sx = size.x / modOrigSize.x;
        }
        if (Math.abs(modOrigSize.y) > 0.0000001) {
            sy = size.y / modOrigSize.y;
        }

        if (event.modifiers.shift) {
            const signx = sx > 0 ? 1 : -1;
            const signy = sy > 0 ? 1 : -1;
            sx = sy = Math.max(Math.abs(sx), Math.abs(sy));
            sx *= signx;
            sy *= signy;
        }

        this.itemGroup.scale(sx, sy, this.pivot);
        
        for (let i = 0; i < this.boundsScaleHandles.length; i++) {
            const handle = this.boundsScaleHandles[i];
            handle.position = this.itemGroup.bounds[this.getRectCornerNameByIndex(i)];
            handle.bringToFront();
        }
        
        for (let i = 0; i < this.boundsRotHandles.length; i++) {
            const handle = this.boundsRotHandles[i];
            if (handle) {
                handle.position = this.itemGroup.bounds[this.getRectCornerNameByIndex(i)] + handle.data.offset;
                handle.bringToFront();
            }
        }
    }
    onMouseUp () {
        this.pivot = null;
        this.origPivot = null;
        this.corner = null;
        this.origSize = null;
        this.origCenter = null;
        this.scaleItems.length = 0;
        this.boundsPath = null;
        this.boundsScaleHandles = [];
        this.boundsRotHandles = [];

        if (!this.itemGroup) {
            return;
        }
        
        this.itemGroup.applyMatrix = true;
        
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
        
        // @todo add back undo
        this.onUpdateSvg();
    }
    getRectCornerNameByIndex (index) {
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
    getOpposingRectCornerNameByIndex (index) {
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
}

export default ScaleTool;
