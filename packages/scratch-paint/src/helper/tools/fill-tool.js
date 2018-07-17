import paper from '@scratch/paper';
import {getHoveredItem} from '../hover';
import {expandBy} from '../math';
import {getColorStringForTransparent} from '../style-path';
import GradientTypes from '../../lib/gradient-types';

class FillTool extends paper.Tool {
    static get TOLERANCE () {
        return 2;
    }
    /**
     * @param {function} setHoveredItem Callback to set the hovered item
     * @param {function} clearHoveredItem Callback to clear the hovered item
     * @param {!function} onUpdateImage A callback to call when the image visibly changes
     */
    constructor (setHoveredItem, clearHoveredItem, onUpdateImage) {
        super();
        this.setHoveredItem = setHoveredItem;
        this.clearHoveredItem = clearHoveredItem;
        this.onUpdateImage = onUpdateImage;

        // We have to set these functions instead of just declaring them because
        // paper.js tools hook up the listeners in the setter functions.
        this.onMouseMove = this.handleMouseMove;
        this.onMouseUp = this.handleMouseUp;

        // Color to fill with
        this.fillColor = null;
        this.fillColor2 = null;
        this.gradientType = null;

        // The path that's being hovered over.
        this.fillItem = null;
        // If we're hovering over a hole in a compound path, we can't just recolor it. This is the
        // added item that's the same shape as the hole that's drawn over the hole when we fill a hole.
        this.addedFillItem = null;
        this.fillItemOrigColor = null;
        this.prevHoveredItemId = null;
    }
    getHitOptions () {
        const isAlmostClosedPath = function (item) {
            return item instanceof paper.Path && item.segments.length > 2 &&
                item.lastSegment.point.getDistance(item.firstSegment.point) < 8;
        };
        return {
            segments: true,
            stroke: true,
            curves: true,
            fill: true,
            guide: false,
            match: function (hitResult) {
                if (hitResult.item instanceof paper.Path &&
                    (hitResult.item.hasFill() || hitResult.item.closed || isAlmostClosedPath(hitResult.item))) {
                    return true;
                }
                if (hitResult.item instanceof paper.PointText) {
                    return true;
                }
            },
            hitUnfilledPaths: true,
            tolerance: FillTool.TOLERANCE / paper.view.zoom
        };
    }
    setFillColor (fillColor) {
        this.fillColor = fillColor;
    }
    setFillColor2 (fillColor2) {
        this.fillColor2 = fillColor2;
    }
    setGradientType (gradientType) {
        this.gradientType = gradientType;
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
        const hitItem = hoveredItem ? hoveredItem.data.origItem : null;
        // Still hitting the same thing
        if ((!hitItem && !this.fillItem) || this.fillItem === hitItem) {
            // Only radial gradient needs to be updated
            if (this.gradientType === GradientTypes.RADIAL) {
                this._setFillItemColor(this.fillColor, this.fillColor2, this.gradientType, event.point);
            }
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
        if (hitItem) {
            this.fillItem = hitItem;
            this.fillItemOrigColor = hitItem.fillColor;
            if (hitItem.parent instanceof paper.CompoundPath && hitItem.area < 0) { // hole
                if (!this.fillColor) {
                    // Hole filled with transparent is no-op
                    this.fillItem = null;
                    this.fillItemOrigColor = null;
                    return;
                }
                // Make an item to fill the hole
                this.addedFillItem = hitItem.clone();
                this.addedFillItem.setClockwise(true);
                this.addedFillItem.data.noHover = true;
                this.addedFillItem.data.origItem = hitItem;
                // This usually fixes it so there isn't a teeny tiny gap in between the fill and the outline
                // when filling in a hole
                expandBy(this.addedFillItem, .1);
                this.addedFillItem.insertAbove(hitItem.parent);
            } else if (this.fillItem.parent instanceof paper.CompoundPath) {
                this.fillItemOrigColor = hitItem.parent.fillColor;
            }
            this._setFillItemColor(this.fillColor, this.fillColor2, this.gradientType, event.point);
        }
    }
    handleMouseUp (event) {
        if (event.event.button > 0) return; // only first mouse button
        if (this.fillItem) {
            // If the hole we're filling in is the same color as the parent, and parent has no outline, remove the hole
            if (this.addedFillItem &&
                    this._noStroke(this.fillItem.parent) &&
                    this.addedFillItem.fillColor.type !== 'gradient' &&
                    this.fillItem.parent.fillColor.toCSS() === this.addedFillItem.fillColor.toCSS()) {
                this.addedFillItem.remove();
                this.addedFillItem = null;
                let parent = this.fillItem.parent;
                this.fillItem.remove();
                parent = parent.reduce();
                parent.fillColor = this.fillColor;
            } else if (this.addedFillItem) {
                // Fill in a hole.
                this.addedFillItem.data.noHover = false;
            } else if (!this.fillColor &&
                    this.fillItem.data &&
                    this.fillItem.data.origItem) {
                // Filling a hole filler with transparent returns it to being gone
                // instead of making a shape that's transparent
                const group = this.fillItem.parent;
                this.fillItem.remove();
                if (!(group instanceof paper.Layer) && group.children.length === 1) {
                    group.reduce();
                }
            }

            this.clearHoveredItem();
            this.fillItem = null;
            this.addedFillItem = null;
            this.fillItemOrigColor = null;
            this.onUpdateImage();
        }
    }
    _noStroke (item) {
        return !item.strokeColor ||
                item.strokeColor.alpha === 0 ||
                item.strokeWidth === 0;
    }
    // Either pass in a fully defined paper.Color as color1,
    // or pass in 2 color strings, a gradient type, and a pointer location
    _setFillItemColor (color1, color2, gradientType, pointerLocation) {
        let fillColor;
        const item = this._getFillItem();
        if (!item) return;
        if (color1 instanceof paper.Color || gradientType === GradientTypes.SOLID) {
            fillColor = color1;
        } else {
            if (color1 === null) {
                color1 = getColorStringForTransparent(color2);
            }
            if (color2 === null) {
                color2 = getColorStringForTransparent(color1);
            }
            const halfLongestDimension = Math.max(item.bounds.width, item.bounds.height) / 2;
            const start = gradientType === GradientTypes.RADIAL ? pointerLocation :
                gradientType === GradientTypes.VERTICAL ? item.bounds.topCenter :
                    gradientType === GradientTypes.HORIZONTAL ? item.bounds.leftCenter :
                        null;
            const end = gradientType === GradientTypes.RADIAL ? start.add(new paper.Point(halfLongestDimension, 0)) :
                gradientType === GradientTypes.VERTICAL ? item.bounds.bottomCenter :
                    gradientType === GradientTypes.HORIZONTAL ? item.bounds.rightCenter :
                        null;
            fillColor = {
                gradient: {
                    stops: [color1, color2],
                    radial: gradientType === GradientTypes.RADIAL
                },
                origin: start,
                destination: end
            };
        }
        item.fillColor = fillColor;
    }
    _getFillItem () {
        if (this.addedFillItem) {
            return this.addedFillItem;
        } else if (this.fillItem && this.fillItem.parent instanceof paper.CompoundPath) {
            return this.fillItem.parent;
        }
        return this.fillItem;
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
