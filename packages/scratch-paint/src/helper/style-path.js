import paper from '@scratch/paper';
import {getSelectedLeafItems} from './selection';
import {isPGTextItem, isPointTextItem} from './item';
import {isGroup} from './group';

const MIXED = 'scratch-paint/style-path/mixed';

/**
 * Called when setting fill color
 * @param {string} colorString New color, css format
 * @param {!function} onUpdateSvg A callback to call when the image visibly changes
 */
const applyFillColorToSelection = function (colorString, onUpdateSvg) {
    const items = getSelectedLeafItems();
    let changed = false;
    for (const item of items) {
        if (isPGTextItem(item)) {
            for (const child of item.children) {
                if (child.children) {
                    for (const path of child.children) {
                        if (!path.data.isPGGlyphRect) {
                            if ((path.fillColor === null && colorString) ||
                                    path.fillColor.toCSS() !== new paper.Color(colorString).toCSS()) {
                                changed = true;
                                path.fillColor = colorString;
                            }
                        }
                    }
                } else if (!child.data.isPGGlyphRect) {
                    if ((child.fillColor === null && colorString) ||
                            child.fillColor.toCSS() !== new paper.Color(colorString).toCSS()) {
                        changed = true;
                        child.fillColor = colorString;
                    }
                }
            }
        } else {
            if (isPointTextItem(item) && !colorString) {
                colorString = 'rgba(0,0,0,0)';
            }
            if ((item.fillColor === null && colorString) ||
                    item.fillColor.toCSS() !== new paper.Color(colorString).toCSS()) {
                changed = true;
                item.fillColor = colorString;
            }
        }
    }
    if (changed) {
        onUpdateSvg();
    }
};

/**
 * Called when setting stroke color
 * @param {string} colorString New color, css format
 * @param {!function} onUpdateSvg A callback to call when the image visibly changes
 */
const applyStrokeColorToSelection = function (colorString, onUpdateSvg) {
    const items = getSelectedLeafItems();
    let changed = false;
    for (const item of items) {
        if (isPGTextItem(item)) {
            if (item.children) {
                for (const child of item.children) {
                    if (child.children) {
                        for (const path of child.children) {
                            if (!path.data.isPGGlyphRect) {
                                if ((path.strokeColor === null && colorString) ||
                                        path.strokeColor.toCSS() !== new paper.Color(colorString).toCSS()) {
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
                if ((item.strokeColor === null && colorString) ||
                        item.strokeColor.toCSS() !== new paper.Color(colorString).toCSS()) {
                    changed = true;
                    item.strokeColor = colorString;
                }
            }
        } else if ((item.strokeColor === null && colorString) ||
                    item.strokeColor.toCSS() !== new paper.Color(colorString).toCSS()) {
            changed = true;
            item.strokeColor = colorString;
        }
    }
    if (changed) {
        onUpdateSvg();
    }
};

/**
 * Called when setting stroke width
 * @param {number} value New stroke width
 * @param {!function} onUpdateSvg A callback to call when the image visibly changes
 */
const applyStrokeWidthToSelection = function (value, onUpdateSvg) {
    const items = getSelectedLeafItems();
    for (const item of items) {
        if (isGroup(item)) {
            continue;
        } else if (item.strokeWidth !== value) {
            item.strokeWidth = value;
            onUpdateSvg();
        }
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
