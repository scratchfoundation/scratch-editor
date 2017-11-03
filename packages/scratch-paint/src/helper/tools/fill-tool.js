import paper from '@scratch/paper';
import {getHoveredItem} from '../hover';

class FillTool extends paper.Tool {
    static get TOLERANCE () {
        return 2;
    }
    /**
     * @param {function} setHoveredItem Callback to set the hovered item
     * @param {function} clearHoveredItem Callback to clear the hovered item
     * @param {!function} onUpdateSvg A callback to call when the image visibly changes
     */
    constructor (setHoveredItem, clearHoveredItem, onUpdateSvg) {
        super();
        this.setHoveredItem = setHoveredItem;
        this.clearHoveredItem = clearHoveredItem;
        this.onUpdateSvg = onUpdateSvg;
        
        // We have to set these functions instead of just declaring them because
        // paper.js tools hook up the listeners in the setter functions.
        this.onMouseMove = this.handleMouseMove;
        this.onMouseUp = this.handleMouseUp;

        this.fillColor = null;
        this.fillItem = null;
        this.addedFillItem = null;
        this.fillItemOrigColor = null;
        this.prevHoveredItemId = null;
    }
    getHitOptions () {
        return {
            segments: true,
            stroke: true,
            curves: true,
            fill: true,
            guide: false,
            match: function (hitResult) {
                return hitResult.item instanceof paper.CompoundPath ||
                    (hitResult.item instanceof paper.Path &&
                        (hitResult.item.closed ||
                            (hitResult.item.segments.length > 2 &&
                            hitResult.item.lastSegment.point.getDistance(hitResult.item.firstSegment.point) < 8)));
            },
            tolerance: FillTool.TOLERANCE / paper.view.zoom
        };
    }
    setFillColor (fillColor) {
        this.fillColor = fillColor;
    }
    /**
     * To be called when the hovered item changes. When the select tool hovers over a
     * new item, it compares against this to see if a hover item change event needs to
     * be fired.
     * @param {paper.Item} prevHoveredItemId ID of the highlight item that indicates the mouse is
     *     over a given item currently
     */
    setPrevHoveredItemId (prevHoveredItemId) {
        this.prevHoveredItemId = prevHoveredItemId;
    }
    handleMouseMove (event) {
        const hoveredItem = getHoveredItem(event, this.getHitOptions(), true /* subselect */);
        if ((!hoveredItem && this.prevHoveredItemId) || // There is no longer a hovered item
                (hoveredItem && !this.prevHoveredItemId) || // There is now a hovered item
                (hoveredItem && this.prevHoveredItemId &&
                    hoveredItem.id !== this.prevHoveredItemId)) { // hovered item changed
            this.setHoveredItem(hoveredItem ? hoveredItem.id : null);
        }
        const hitResult = hoveredItem ? hoveredItem.data.hitResult : null;

        // Still hitting the same thing
        if ((!hitResult && !this.fillItem) || this.fillItem === hitResult) {
            return;
        }
        if (this.fillItem) {
            if (this.addedFillItem) {
                this.addedFillItem.remove();
                this.addedFillItem = null;
            } else {
                this._setFillItemColor(this.fillItemOrigColor);
            }
            this.fillItemOrigColor = null;
            this.fillItem = null;
        }
        if (hitResult) {
            const item = hitResult.item;
            this.fillItem = item;
            if (item.parent instanceof paper.CompoundPath && item.area < 0) { // hole
                this.addedFillItem = item.clone();
                this.addedFillItem.insertAbove(item.parent);
            } else if (this.fillItem.parent instanceof paper.CompoundPath) {
                this.fillItemOrigColor = item.parent.fillColor;
            } else {
                this.fillItemOrigColor = item.fillColor;
            }
            this._setFillItemColor(this.fillColor);
        }
    }
    handleMouseUp (event) {
        if (event.event.button > 0) return; // only first mouse button
        if (this.fillItem) {
            // if the hole we're filling in is the same color as the parent, remove the hole
            if (this.addedFillItem &&
                    this.fillItem.parent.fillColor.toCSS() === this.addedFillItem.fillColor.toCSS()) {
                this.addedFillItem.remove();
                this.fillItem.remove();
            }
            this.fillItem = null;
            this.addedFillItem = null;
            this.fillItemOrigColor = null;
            this.onUpdateSvg();
        }
    }
    _setFillItemColor (color) {
        if (this.addedFillItem) {
            this.addedFillItem.fillColor = color;
        } else if (this.fillItem.parent instanceof paper.CompoundPath) {
            this.fillItem.parent.fillColor = color;
        } else {
            this.fillItem.fillColor = color;
        }
    }
    deactivateTool () {
        if (this.fillItem) {
            this._setFillItemColor(this.fillItemOrigColor);
            this.fillItemOrigColor = null;
            this.fillItem = null;
        }
        this.clearHoveredItem();
        this.setHoveredItem = null;
        this.clearHoveredItem = null;
    }
}

export default FillTool;
