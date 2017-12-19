import paper from '@scratch/paper';
import {getSelectedLeafItems} from './selection';
import {isPGTextItem, isPointTextItem} from './item';
import {isGroup} from './group';

const MIXED = 'scratch-paint/style-path/mixed';

// Check if the item color matches the incoming color. If the item color is a gradient, we assume
// that the incoming color never matches, since we don't support gradients yet.
const _colorMatch = function (itemColor, incomingColor) {
    // @todo check whether the gradient has changed when we support gradients
    if (itemColor && itemColor.type === 'gradient') return false;
    // Either both are null or both are the same color when converted to CSS.
    return (!itemColor && !incomingColor) ||
            (itemColor && incomingColor && itemColor.toCSS() === new paper.Color(incomingColor).toCSS());
};

/**
 * Called when setting fill color
 * @param {string} colorString New color, css format
 * @return {boolean} Whether the color application actually changed visibly.
 */
const applyFillColorToSelection = function (colorString) {
    const items = getSelectedLeafItems();
    let changed = false;
    for (const item of items) {
        if (isPGTextItem(item)) {
            for (const child of item.children) {
                if (child.children) {
                    for (const path of child.children) {
                        if (!path.data.isPGGlyphRect) {
                            if (!_colorMatch(path.fillColor, colorString)) {
                                changed = true;
                                path.fillColor = colorString;
                            }
                        }
                    }
                } else if (!child.data.isPGGlyphRect) {
                    if (!_colorMatch(child.fillColor, colorString)) {
                        changed = true;
                        child.fillColor = colorString;
                    }
                }
            }
        } else {
            if (isPointTextItem(item) && !colorString) {
                colorString = 'rgba(0,0,0,0)';
            }
            if (!_colorMatch(item.fillColor, colorString)) {
                changed = true;
                item.fillColor = colorString;
            }
        }
    }
    return changed;
};

/**
 * Called when setting stroke color
 * @param {string} colorString New color, css format
 * @return {boolean} Whether the color application actually changed visibly.
 */
const applyStrokeColorToSelection = function (colorString) {
    const items = getSelectedLeafItems();
    let changed = false;
    for (const item of items) {
        if (isPGTextItem(item)) {
            if (item.children) {
                for (const child of item.children) {
                    if (child.children) {
                        for (const path of child.children) {
                            if (!path.data.isPGGlyphRect) {
                                if (!_colorMatch(path.strokeColor, colorString)) {
                                    changed = true;
                                    path.strokeColor = colorString;
                                }
                            }
                        }
                    } else if (!child.data.isPGGlyphRect) {
                        if (child.strokeColor !== colorString) {
                            changed = true;
                            child.strokeColor = colorString;
                        }
                    }
                }
            } else if (!item.data.isPGGlyphRect) {
                if (!_colorMatch(item.strokeColor, colorString)) {
                    changed = true;
                    item.strokeColor = colorString;
                }
            }
        } else if (!_colorMatch(item.strokeColor, colorString)) {
            changed = true;
            item.strokeColor = colorString;
        }
    }
    return changed;
};

/**
 * Called when setting stroke width
 * @param {number} value New stroke width
 * @param {!function} onUpdateSvg A callback to call when the image visibly changes
 */
const applyStrokeWidthToSelection = function (value, onUpdateSvg) {
    let changed = false;
    const items = getSelectedLeafItems();
    for (const item of items) {
        if (isGroup(item)) {
            continue;
        } else if (item.strokeWidth !== value) {
            item.strokeWidth = value;
            changed = true;
        }
    }
    if (changed) {
        onUpdateSvg();
    }
};

/**
 * Get state of colors and stroke width for selection
 * @param {!Array<paper.Item>} selectedItems Selected paper items
 * @return {object} Object of strokeColor, strokeWidth, fillColor of the selection.
 *     Gives MIXED when there are mixed values for a color, and null for transparent.
 *     Gives null when there are mixed values for stroke width.
 */
const getColorsFromSelection = function (selectedItems) {
    let selectionFillColorString;
    let selectionStrokeColorString;
    let selectionStrokeWidth;
    let firstChild = true;

    for (const item of selectedItems) {
        let itemFillColorString;
        let itemStrokeColorString;

        // handle pgTextItems differently by going through their children
        if (isPGTextItem(item)) {
            for (const child of item.children) {
                for (const path of child.children) {
                    if (!path.data.isPGGlyphRect) {
                        if (path.fillColor) {
                            itemFillColorString = path.fillColor.toCSS();
                        }
                        if (path.strokeColor) {
                            itemStrokeColorString = path.strokeColor.toCSS();
                        }
                        // check every style against the first of the items
                        if (firstChild) {
                            firstChild = false;
                            selectionFillColorString = itemFillColorString;
                            selectionStrokeColorString = itemStrokeColorString;
                            selectionStrokeWidth = path.strokeWidth;
                        }
                        if (itemFillColorString !== selectionFillColorString) {
                            selectionFillColorString = MIXED;
                        }
                        if (itemStrokeColorString !== selectionStrokeColorString) {
                            selectionStrokeColorString = MIXED;
                        }
                        if (selectionStrokeWidth !== path.strokeWidth) {
                            selectionStrokeWidth = null;
                        }
                    }
                }
            }
        } else if (!isGroup(item)) {
            if (item.fillColor) {
                // hack bc text items with null fill can't be detected by fill-hitTest anymore
                if (isPointTextItem(item) && item.fillColor.toCSS() === 'rgba(0,0,0,0)') {
                    itemFillColorString = null;
                } else if (item.fillColor.type === 'gradient') {
                    itemFillColorString = MIXED;
                } else {
                    itemFillColorString = item.fillColor.toCSS();
                }
            }
            if (item.strokeColor) {
                if (item.strokeColor.type === 'gradient') {
                    itemStrokeColorString = MIXED;
                } else {
                    itemStrokeColorString = item.strokeColor.toCSS();
                }
            }
            // check every style against the first of the items
            if (firstChild) {
                firstChild = false;
                selectionFillColorString = itemFillColorString;
                selectionStrokeColorString = itemStrokeColorString;
                selectionStrokeWidth = item.strokeWidth;
            }
            if (itemFillColorString !== selectionFillColorString) {
                selectionFillColorString = MIXED;
            }
            if (itemStrokeColorString !== selectionStrokeColorString) {
                selectionStrokeColorString = MIXED;
            }
            if (selectionStrokeWidth !== item.strokeWidth) {
                selectionStrokeWidth = null;
            }
        }
    }
    return {
        fillColor: selectionFillColorString ? selectionFillColorString : null,
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
    applyStrokeColorToSelection,
    applyStrokeWidthToSelection,
    getColorsFromSelection,
    MIXED,
    styleBlob,
    styleShape,
    stylePath,
    styleCursorPreview
};
