import paper from '@scratch/paper';
import {getSelectedLeafItems} from './selection';
import {isPointTextItem} from './item';
import {isGroup} from './group';
import {getItems} from './selection';
import GradientTypes from '../lib/gradient-types';
import parseColor from 'parse-color';
import {DEFAULT_COLOR} from '../reducers/fill-color';

const MIXED = 'scratch-paint/style-path/mixed';

// Check if the item color matches the incoming color. If the item color is a gradient, we assume
// that the incoming color never matches, since we don't support gradients yet.
const _colorMatch = function (itemColor, incomingColor) {
    // @todo colorMatch should not be called with gradients as arguments once stroke gradients are supported
    if (itemColor && itemColor.type === 'gradient') return false;
    // Either both are null or both are the same color when converted to CSS.
    return (!itemColor && !incomingColor) ||
            (itemColor && incomingColor && itemColor.toCSS() === new paper.Color(incomingColor).toCSS());
};

// Selected items and currently active text edit items respond to color changes.
const _getColorStateListeners = function (textEditTargetId) {
    const items = getSelectedLeafItems();
    if (textEditTargetId) {
        const matches = getItems({
            match: item => item.id === textEditTargetId
        });
        if (matches.length) {
            items.push(matches[0]);
        }
    }
    return items;
};

/**
 * Transparent R, G, B values need to match the other color of the gradient
 * in order to form a smooth gradient, otherwise it fades through black. This
 * function gets the transparent color for a given color string.
 * @param {?string} colorToMatch CSS string of other color of gradient, or null for transparent
 * @return {string} CSS string for matching color of transparent
 */
const getColorStringForTransparent = function (colorToMatch) {
    const color = new paper.Color(colorToMatch);
    color.alpha = 0;
    return color.toCSS();
};

// Returns a color shift by 72 of the given color, DEFAULT_COLOR if the given color is null, or null if it is MIXED.
const getRotatedColor = function (firstColor) {
    if (firstColor === MIXED) return null;
    const color = new paper.Color(firstColor);
    if (!firstColor || color.alpha === 0) return DEFAULT_COLOR;
    return parseColor(
        `hsl(${(color.hue - 72) % 360}, ${color.saturation * 100}, ${Math.max(color.lightness * 100, 10)})`).hex;
};

/**
 * Convert params to a paper.Color gradient object
 * @param {?string} color1 CSS string, or null for transparent
 * @param {?string} color2 CSS string, or null for transparent
 * @param {GradientType} gradientType gradient type
 * @param {paper.Rectangle} bounds Bounds of the object
 * @param {paper.Point} radialCenter Where the center of a radial gradient should be, if the gradient is radial
 * @return {paper.Color} Color object with gradient, may be null or color string if the gradient type is solid
 */
const createGradientObject = function (color1, color2, gradientType, bounds, radialCenter) {
    if (gradientType === GradientTypes.SOLID) return color1;
    if (color1 === null) {
        color1 = getColorStringForTransparent(color2);
    }
    if (color2 === null) {
        color2 = getColorStringForTransparent(color1);
    }
    const halfLongestDimension = Math.max(bounds.width, bounds.height) / 2;
    const start = gradientType === GradientTypes.RADIAL ? radialCenter :
        gradientType === GradientTypes.VERTICAL ? bounds.topCenter :
            gradientType === GradientTypes.HORIZONTAL ? bounds.leftCenter :
                null;
    const end = gradientType === GradientTypes.RADIAL ? start.add(new paper.Point(halfLongestDimension, 0)) :
        gradientType === GradientTypes.VERTICAL ? bounds.bottomCenter :
            gradientType === GradientTypes.HORIZONTAL ? bounds.rightCenter :
                null;
    return {
        gradient: {
            stops: [color1, color2],
            radial: gradientType === GradientTypes.RADIAL
        },
        origin: start,
        destination: end
    };
};

/**
 * Called when setting fill color
 * @param {string} colorString color, css format, or null if completely transparent
 * @param {number} colorIndex index of color being changed
 * @param {boolean} isSolidGradient True if is solid gradient. Sometimes the item has a gradient but the color
 *     picker is set to a solid gradient. This happens when a mix of colors and gradient types is selected.
 *     When changing the color in this case, the solid gradient should override the existing gradient on the item.
 * @param {?boolean} bitmapMode True if the fill color is being set in bitmap mode
 * @param {?string} textEditTargetId paper.Item.id of text editing target, if any
 * @return {boolean} Whether the color application actually changed visibly.
 */
const applyFillColorToSelection = function (colorString, colorIndex, isSolidGradient, bitmapMode, textEditTargetId) {
    const items = _getColorStateListeners(textEditTargetId);
    let changed = false;
    for (let item of items) {
        if (item.parent instanceof paper.CompoundPath) {
            item = item.parent;
        }

        // In bitmap mode, fill color applies to the stroke if there is a stroke
        if (bitmapMode && item.strokeColor !== null && item.strokeWidth) {
            if (!_colorMatch(item.strokeColor, colorString)) {
                changed = true;
                item.strokeColor = colorString;
            }
        } else if (isSolidGradient || !item.fillColor || !item.fillColor.gradient ||
                !item.fillColor.gradient.stops.length === 2) {
            // Applying a solid color
            if (!_colorMatch(item.fillColor, colorString)) {
                changed = true;
                if (isPointTextItem(item) && !colorString) {
                    // Allows transparent text to be hit
                    item.fillColor = 'rgba(0,0,0,0)';
                } else {
                    item.fillColor = colorString;
                }
            }
        } else if (!_colorMatch(item.fillColor.gradient.stops[colorIndex].color, colorString)) {
            // Changing one color of an existing gradient
            changed = true;
            const otherIndex = colorIndex === 0 ? 1 : 0;
            if (colorString === null) {
                colorString = getColorStringForTransparent(item.fillColor.gradient.stops[otherIndex].color.toCSS());
            }
            const colors = [0, 0];
            colors[colorIndex] = colorString;
            // If the other color is transparent, its RGB values need to be adjusted for the gradient to be smooth
            if (item.fillColor.gradient.stops[otherIndex].color.alpha === 0) {
                colors[otherIndex] = getColorStringForTransparent(colorString);
            } else {
                colors[otherIndex] = item.fillColor.gradient.stops[otherIndex].color.toCSS();
            }
            // There seems to be a bug where setting colors on stops doesn't always update the view, so set gradient.
            item.fillColor.gradient = {stops: colors, radial: item.fillColor.gradient.radial};
        }
    }
    return changed;
};

/**
 * Called to swap gradient colors
 * @param {?boolean} bitmapMode True if the fill color is being set in bitmap mode
 * @param {?string} textEditTargetId paper.Item.id of text editing target, if any
 * @return {boolean} Whether the color application actually changed visibly.
 */
const swapColorsInSelection = function (bitmapMode, textEditTargetId) {
    const items = _getColorStateListeners(textEditTargetId);
    let changed = false;
    for (let item of items) {
        if (item.parent instanceof paper.CompoundPath) {
            item = item.parent;
        }

        if (bitmapMode) {
            // @todo
            return;
        } else if (!item.fillColor || !item.fillColor.gradient || !item.fillColor.gradient.stops.length === 2) {
            // Only one color; nothing to swap
            continue;
        } else if (!item.fillColor.gradient.stops[0].color.equals(item.fillColor.gradient.stops[1].color)) {
            // Changing one color of an existing gradient
            changed = true;
            const colors = [
                item.fillColor.gradient.stops[1].color.toCSS(),
                item.fillColor.gradient.stops[0].color.toCSS()
            ];
            // There seems to be a bug where setting colors on stops doesn't always update the view, so set gradient.
            item.fillColor.gradient = {stops: colors, radial: item.fillColor.gradient.radial};
        }
    }
    return changed;
};

/**
 * Called when setting gradient type
 * @param {GradientType} gradientType gradient type
 * @param {?boolean} bitmapMode True if the fill color is being set in bitmap mode
 * @param {?string} textEditTargetId paper.Item.id of text editing target, if any
 * @return {boolean} Whether the color application actually changed visibly.
 */
const applyGradientTypeToSelection = function (gradientType, bitmapMode, textEditTargetId) {
    const items = _getColorStateListeners(textEditTargetId);
    let changed = false;
    for (let item of items) {
        if (item.parent instanceof paper.CompoundPath) {
            item = item.parent;
        }

        let itemColor1;
        if (item.fillColor === null || item.fillColor.alpha === 0) {
            // Transparent
            itemColor1 = null;
        } else if (!item.fillColor.gradient) {
            // Solid color
            itemColor1 = item.fillColor.toCSS();
        } else if (!item.fillColor.gradient.stops[0] || item.fillColor.gradient.stops[0].color.alpha === 0) {
            // Gradient where first color is transparent
            itemColor1 = null;
        } else {
            // Gradient where first color is not transparent
            itemColor1 = item.fillColor.gradient.stops[0].color.toCSS();
        }

        let itemColor2;
        if (!item.fillColor || !item.fillColor.gradient || !item.fillColor.gradient.stops[1]) {
            // If item color is solid or a gradient that has no 2nd color, set the 2nd color based on the first color
            itemColor2 = getRotatedColor(itemColor1);
        } else if (item.fillColor.gradient.stops[1].color.alpha === 0) {
            // Gradient has 2nd color which is transparent
            itemColor2 = null;
        } else {
            // Gradient has 2nd color which is not transparent
            itemColor2 = item.fillColor.gradient.stops[1].color.toCSS();
        }

        if (bitmapMode) {
            // @todo Add when we apply gradients to selections in bitmap mode
            continue;
        } else if (gradientType === GradientTypes.SOLID) {
            if (item.fillColor && item.fillColor.gradient) {
                changed = true;
                item.fillColor = itemColor1;
            }
            continue;
        }

        if (itemColor1 === null) {
            itemColor1 = getColorStringForTransparent(itemColor2);
        }
        if (itemColor2 === null) {
            itemColor2 = getColorStringForTransparent(itemColor1);
        }
        if (gradientType === GradientTypes.RADIAL) {
            const hasRadialGradient = item.fillColor && item.fillColor.gradient && item.fillColor.gradient.radial;
            if (!hasRadialGradient) {
                changed = true;
                const halfLongestDimension = Math.max(item.bounds.width, item.bounds.height) / 2;
                item.fillColor = {
                    gradient: {
                        stops: [itemColor1, itemColor2],
                        radial: true
                    },
                    origin: item.position,
                    destination: item.position.add(new paper.Point(halfLongestDimension, 0))
                };
            }
        } else if (gradientType === GradientTypes.HORIZONTAL) {
            const hasHorizontalGradient = item.fillColor && item.fillColor.gradient &&
                !item.fillColor.gradient.radial &&
                Math.abs(item.fillColor.origin.y - item.fillColor.destination.y) < 1e-8;
            if (!hasHorizontalGradient) {
                changed = true;
                item.fillColor = {
                    gradient: {
                        stops: [itemColor1, itemColor2]
                    },
                    origin: item.bounds.leftCenter,
                    destination: item.bounds.rightCenter
                };
            }
        } else if (gradientType === GradientTypes.VERTICAL) {
            const hasVerticalGradient = item.fillColor && item.fillColor.gradient && !item.fillColor.gradient.radial &&
                Math.abs(item.fillColor.origin.x - item.fillColor.destination.x) < 1e-8;
            if (!hasVerticalGradient) {
                changed = true;
                item.fillColor = {
                    gradient: {
                        stops: [itemColor1, itemColor2]
                    },
                    origin: item.bounds.topCenter,
                    destination: item.bounds.bottomCenter
                };
            }
        }
    }
    return changed;
};

/**
 * Called when setting stroke color
 * @param {string} colorString New color, css format
 * @param {?boolean} bitmapMode True if the stroke color is being set in bitmap mode
 * @param {?string} textEditTargetId paper.Item.id of text editing target, if any
 * @return {boolean} Whether the color application actually changed visibly.
 */
const applyStrokeColorToSelection = function (colorString, bitmapMode, textEditTargetId) {
    // Bitmap mode doesn't have stroke color
    if (bitmapMode) return false;

    const items = _getColorStateListeners(textEditTargetId);
    let changed = false;
    for (let item of items) {
        if (item.parent instanceof paper.CompoundPath) {
            item = item.parent;
        }
        if (!_colorMatch(item.strokeColor, colorString)) {
            changed = true;
            item.strokeColor = colorString;
        }
    }
    return changed;
};

/**
 * Called when setting stroke width
 * @param {number} value New stroke width
 * @param {?string} textEditTargetId paper.Item.id of text editing target, if any
 * @return {boolean} Whether the color application actually changed visibly.
 */
const applyStrokeWidthToSelection = function (value, textEditTargetId) {
    let changed = false;
    const items = _getColorStateListeners(textEditTargetId);
    for (let item of items) {
        if (item.parent instanceof paper.CompoundPath) {
            item = item.parent;
        }
        if (isGroup(item)) {
            continue;
        } else if (item.strokeWidth !== value) {
            item.strokeWidth = value;
            changed = true;
        }
    }
    return changed;
};

/**
 * Get state of colors and stroke width for selection
 * @param {!Array<paper.Item>} selectedItems Selected paper items
 * @param {?boolean} bitmapMode True if the item is being selected in bitmap mode
 * @return {?object} Object of strokeColor, strokeWidth, fillColor, thickness of the selection.
 *     Gives MIXED when there are mixed values for a color, and null for transparent.
 *     Gives null when there are mixed values for stroke width.
 *     Thickness is line thickness, used in the bitmap editor
 */
const getColorsFromSelection = function (selectedItems, bitmapMode) {
    let selectionFillColorString;
    let selectionFillColor2String;
    let selectionStrokeColorString;
    let selectionStrokeWidth;
    let selectionThickness;
    let selectionGradientType;
    let firstChild = true;

    for (let item of selectedItems) {
        if (item.parent instanceof paper.CompoundPath) {
            // Compound path children inherit fill and stroke color from their parent.
            item = item.parent;
        }
        let itemFillColorString;
        let itemFillColor2String;
        let itemStrokeColorString;
        let itemGradientType = GradientTypes.SOLID;

        if (!isGroup(item)) {
            if (item.fillColor) {
                // hack bc text items with null fill can't be detected by fill-hitTest anymore
                if (isPointTextItem(item) && item.fillColor.alpha === 0) {
                    itemFillColorString = null;
                } else if (item.fillColor.type === 'gradient') {
                    // Scratch only recognizes 2 color gradients
                    if (item.fillColor.gradient.stops.length === 2) {
                        if (item.fillColor.gradient.radial) {
                            itemGradientType = GradientTypes.RADIAL;
                        } else {
                            // Always use horizontal for linear gradients, since horizontal and vertical gradients
                            // are the same with rotation. We don't want to show MIXED just because anything is rotated.
                            itemGradientType = GradientTypes.HORIZONTAL;
                        }
                        itemFillColorString = item.fillColor.gradient.stops[0].color.alpha === 0 ?
                            null :
                            item.fillColor.gradient.stops[0].color.toCSS();
                        itemFillColor2String = item.fillColor.gradient.stops[1].color.alpha === 0 ?
                            null :
                            item.fillColor.gradient.stops[1].color.toCSS();
                    } else {
                        itemFillColorString = MIXED;
                        itemFillColor2String = MIXED;
                    }
                } else {
                    itemFillColorString = item.fillColor.alpha === 0 ?
                        null :
                        item.fillColor.toCSS();
                }
            }
            if (item.strokeColor) {
                // Stroke color is fill color in bitmap
                if (bitmapMode) {
                    itemFillColorString = item.strokeColor.toCSS();
                } else if (item.strokeColor.type === 'gradient') {
                    itemStrokeColorString = MIXED;
                } else {
                    itemStrokeColorString = item.strokeColor.alpha === 0 || !item.strokeWidth ?
                        null :
                        item.strokeColor.toCSS();
                }
            } else {
                itemStrokeColorString = null;
            }
            // check every style against the first of the items
            if (firstChild) {
                firstChild = false;
                selectionFillColorString = itemFillColorString;
                selectionFillColor2String = itemFillColor2String;
                selectionStrokeColorString = itemStrokeColorString;
                selectionGradientType = itemGradientType;
                selectionStrokeWidth = itemStrokeColorString ? item.strokeWidth : 0;
                if (item.strokeWidth && item.data && item.data.zoomLevel) {
                    selectionThickness = item.strokeWidth / item.data.zoomLevel;
                }
            }
            if (itemFillColorString !== selectionFillColorString) {
                selectionFillColorString = MIXED;
            }
            if (itemFillColor2String !== selectionFillColor2String) {
                selectionFillColor2String = MIXED;
            }
            if (itemGradientType !== selectionGradientType) {
                selectionGradientType = GradientTypes.SOLID;
                selectionFillColorString = MIXED;
                selectionFillColor2String = MIXED;
            }
            if (itemStrokeColorString !== selectionStrokeColorString) {
                selectionStrokeColorString = MIXED;
            }
            const itemStrokeWidth = itemStrokeColorString ? item.strokeWidth : 0;
            if (selectionStrokeWidth !== itemStrokeWidth) {
                selectionStrokeWidth = null;
            }
        }
    }
    // Convert selection gradient type from horizontal to vertical if first item is exactly vertical
    if (selectedItems && selectedItems.length && selectionGradientType !== GradientTypes.SOLID) {
        let firstItem = selectedItems[0];
        if (firstItem.parent instanceof paper.CompoundPath) firstItem = firstItem.parent;
        const direction = firstItem.fillColor.destination.subtract(firstItem.fillColor.origin);
        if (Math.abs(direction.angle) === 90) {
            selectionGradientType = GradientTypes.VERTICAL;
        }
    }
    if (bitmapMode) {
        return {
            fillColor: selectionFillColorString ? selectionFillColorString : null,
            fillColor2: selectionFillColor2String ? selectionFillColor2String : null,
            gradientType: selectionGradientType,
            thickness: selectionThickness
        };
    }
    return {
        fillColor: selectionFillColorString ? selectionFillColorString : null,
        fillColor2: selectionFillColor2String ? selectionFillColor2String : null,
        gradientType: selectionGradientType,
        strokeColor: selectionStrokeColorString ? selectionStrokeColorString : null,
        strokeWidth: selectionStrokeWidth || (selectionStrokeWidth === null) ? selectionStrokeWidth : 0
    };
};

const styleBlob = function (path, options) {
    if (options.isEraser) {
        path.fillColor = 'white';
    } else if (options.fillColor) {
        path.fillColor = options.fillColor;
    } else {
        // Make sure something visible is drawn
        path.fillColor = 'black';
    }
};

const stylePath = function (path, strokeColor, strokeWidth) {
    // Make sure a visible line is drawn
    path.setStrokeColor(
        (strokeColor === MIXED || strokeColor === null) ? 'black' : strokeColor);
    path.setStrokeWidth(
        strokeWidth === null || strokeWidth === 0 ? 1 : strokeWidth);
};

const styleCursorPreview = function (path, options) {
    if (options.isEraser) {
        path.fillColor = 'white';
        path.strokeColor = 'cornflowerblue';
        path.strokeWidth = 1;
    } else if (options.fillColor) {
        path.fillColor = options.fillColor;
    } else {
        // Make sure something visible is drawn
        path.fillColor = 'black';
    }
};

const styleShape = function (path, options) {
    path.fillColor = options.fillColor;
    path.strokeColor = options.strokeColor;
    path.strokeWidth = options.strokeWidth;
};

export {
    applyFillColorToSelection,
    applyGradientTypeToSelection,
    applyStrokeColorToSelection,
    applyStrokeWidthToSelection,
    createGradientObject,
    getColorsFromSelection,
    getRotatedColor,
    MIXED,
    styleBlob,
    styleShape,
    stylePath,
    styleCursorPreview,
    swapColorsInSelection
};
