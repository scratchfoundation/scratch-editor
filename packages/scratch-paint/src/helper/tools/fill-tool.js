import paper from '@scratch/paper';
import {getHoveredItem} from '../hover';
import {expandBy} from '../math';
import {createGradientObject} from '../style-path';
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
        this.onMouseDown = this.handleMouseDown;
        this.onMouseMove = this.handleMouseMove;
        this.onMouseUp = this.handleMouseUp;

        // Color to fill with
        this.fillColor = null;
        this.fillColor2 = null;
        this.gradientType = null;

        // The path that's being hovered over.
        this.fillItem = null;
        // The style property that we're applying the color to (either fill or stroke).
        this.fillProperty = null;
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
            segments: false,
            stroke: true,
            curves: false,
            fill: true,
            guide: false,
            match: function (hitResult) {
                // Allow fills to be hit only if the item has a fill already or the path is closed/nearly closed
                const hitFill = hitResult.item.hasFill() || hitResult.item.closed || isAlmostClosedPath(hitResult.item);
                if (hitResult.item instanceof paper.Path &&
                    // Disallow hits that don't qualify for the fill criteria, but only if they're fills
                    (hitFill || hitResult.type !== 'fill')) {
                    return true;
                }
                if (hitResult.item instanceof paper.PointText) {
                    return true;
                }
            },
            hitUnfilledPaths: true,
            // If the color is transparent/none, then we need to be able to hit "invisible" outlines so that we don't
            // prevent ourselves from hitting an outline when we make it transparent via the fill preview, causing it to
            // flicker back and forth between transparent/its previous color as we hit it, then stop hitting it, etc.
            // If the color *is* visible, then don't hit "invisible" outlines, since this would add visible outlines to
            // non-outlined shapes when you hovered over where their outlines would be.
            hitUnstrokedPaths: this.gradientType === GradientTypes.SOLID && this.fillColor === null,
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
    updateFillPreview (event) {
        const hoveredItem = getHoveredItem(event, this.getHitOptions(), true /* subselect */);
        if ((!hoveredItem && this.prevHoveredItemId) || // There is no longer a hovered item
                (hoveredItem && !this.prevHoveredItemId) || // There is now a hovered item
                (hoveredItem && this.prevHoveredItemId &&
                    hoveredItem.id !== this.prevHoveredItemId)) { // hovered item changed
            this.setHoveredItem(hoveredItem ? hoveredItem.id : null);
        }
        const hitItem = hoveredItem ? hoveredItem.data.origItem : null;
        const hitType = hoveredItem ? hoveredItem.data.hitResult.type : null;

        // The hit "target" changes if we switch items or switch between fill/outline on the same item
        const hitTargetChanged = hitItem !== this.fillItem || hitType !== this.fillProperty;

        // Still hitting the same thing
        if (!hitTargetChanged) {
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
            this.fillProperty = null;
        }
        if (hitItem) {
            this.fillItem = hitItem;
            this.fillProperty = hitType;
            const colorProp = hitType === 'fill' ? 'fillColor' : 'strokeColor';
            this.fillItemOrigColor = hitItem[colorProp];
            if (hitItem.parent instanceof paper.CompoundPath && hitItem.area < 0 && hitType === 'fill') { // hole
                if (!this.fillColor) {
                    // Hole filled with transparent is no-op
                    this.fillItem = null;
                    this.fillProperty = null;
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
                this.fillItemOrigColor = hitItem.parent[colorProp];
            }
            this._setFillItemColor(this.fillColor, this.fillColor2, this.gradientType, event.point);
        }
    }
    handleMouseDown (event) {
        // on touch, the user might touch-and-hold to preview what the fill tool would do
        // if they don't move their finger at all after the "mouse down" event
        // then this might be our only chance to give them a good preview
        this.updateFillPreview(event);
    }
    handleMouseMove (event) {
        this.updateFillPreview(event);
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
            this.fillProperty = null;
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
        const item = this._getFillItem();
        if (!item) return;
        const colorProp = this.fillProperty === 'fill' ? 'fillColor' : 'strokeColor';
        // Only create a gradient if specifically requested, else use color1 directly
        // This ensures we do not set a gradient by accident (see scratch-paint#830).
        if (gradientType && gradientType !== GradientTypes.SOLID) {
            item[colorProp] = createGradientObject(
                color1,
                color2,
                gradientType,
                item.bounds,
                pointerLocation,
                item.strokeWidth
            );
        } else {
            item[colorProp] = color1;
        }
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
            this.fillProperty = null;
        }
        this.clearHoveredItem();
        this.setHoveredItem = null;
        this.clearHoveredItem = null;
    }
}

export default FillTool;
