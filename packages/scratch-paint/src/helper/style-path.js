import {getSelectedItems} from './selection';
import {isPGTextItem, isPointTextItem} from './item';
import {isGroup} from './group';

const MIXED = 'scratch-paint/style-path/mixed';

/**
 * Called when setting fill color
 * @param {string} colorString New color, css format
 */
const applyFillColorToSelection = function (colorString) {
    const items = getSelectedItems(true /* recursive */);
    for (const item of items) {
        if (isPGTextItem(item)) {
            for (const child of item.children) {
                if (child.children) {
                    for (const path of child.children) {
                        if (!path.data.isPGGlyphRect) {
                            path.fillColor = colorString;
                        }
                    }
                } else if (!child.data.isPGGlyphRect) {
                    child.fillColor = colorString;
                }
            }
        } else {
            if (isPointTextItem(item) && !colorString) {
                colorString = 'rgba(0,0,0,0)';
            }
            item.fillColor = colorString;
        }
    }
    // @todo add back undo
};

/**
 * Called when setting stroke color
 * @param {string} colorString New color, css format
 */
const applyStrokeColorToSelection = function (colorString) {
    const items = getSelectedItems(true /* recursive */);

    for (const item of items) {
        if (isPGTextItem(item)) {
            if (item.children) {
                for (const child of item.children) {
                    if (child.children) {
                        for (const path of child.children) {
                            if (!path.data.isPGGlyphRect) {
                                path.strokeColor = colorString;
                            }
                        }
                    } else if (!child.data.isPGGlyphRect) {
                        child.strokeColor = colorString;
                    }
                }
            } else if (!item.data.isPGGlyphRect) {
                item.strokeColor = colorString;
            }
        } else {
            item.strokeColor = colorString;
        }
    }
    // @todo add back undo
};

/**
 * Called when setting stroke width
 * @param {number} value New stroke width
 */
const applyStrokeWidthToSelection = function (value) {
    const items = getSelectedItems(true /* recursive */);
    for (const item of items) {
        if (isGroup(item)) {
            continue;
        } else {
            item.strokeWidth = value;
        }
    }
    // @todo add back undo
};

/**
 * Get state of colors and stroke width for selection
 * @return {object} Object of strokeColor, strokeWidth, fillColor of the selection.
 *     Gives MIXED when there are mixed values for a color, and null for transparent.
 *     Gives null when there are mixed values for stroke width.
 */
const getColorsFromSelection = function () {
    const selectedItems = getSelectedItems(true /* recursive */);
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
                } else {
                    itemFillColorString = item.fillColor.toCSS();
                }
            }
            if (item.strokeColor) {
                itemStrokeColorString = item.strokeColor.toCSS();
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

const stylePath = function (path, options) {
    if (options.isEraser) {
        path.fillColor = 'white';
    } else {
        path.fillColor = options.fillColor;
    }
};

const styleCursorPreview = function (path, options) {
    if (options.isEraser) {
        path.fillColor = 'white';
        path.strokeColor = 'cornflowerblue';
        path.strokeWidth = 1;
    } else {
        path.fillColor = options.fillColor;
    }
};

export {
    applyFillColorToSelection,
    applyStrokeColorToSelection,
    applyStrokeWidthToSelection,
    getColorsFromSelection,
    MIXED,
    stylePath,
    styleCursorPreview
};
