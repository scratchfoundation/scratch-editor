import paper from '@scratch/paper';
import Modes from '../lib/modes';

import {getItemsGroup, isGroup} from './group';
import {getRootItem, isCompoundPathItem, isBoundsItem, isPathItem, isPGTextItem} from './item';
import {getItemsCompoundPath, isCompoundPath, isCompoundPathChild} from './compound-path';
import {sortItemsByZIndex} from './math';

/**
 * Wrapper for paper.project.getItems that excludes our helper items
 * @param {?object} options See paper.js docs for paper.Item.getItems
 * @return {Array<paper.Item>} items that match options
 */
const getItems = function (options) {
    const newMatcher = function (item) {
        return !(item instanceof paper.Layer) && !item.locked &&
            !(item.data && item.data.isHelperItem) &&
            (!options.match || options.match(item));
    };
    const newOptions = {...options, match: newMatcher};
    return paper.project.getItems(newOptions);
};

/**
 * @param {boolean} includeGuides True if guide layer items like the bounding box should
 *     be included in the returned items.
 * @return {Array<paper.item>} all top-level (direct descendants of a paper.Layer) items
 */
const getAllRootItems = function (includeGuides) {
    includeGuides = includeGuides || false;
    const allItems = [];
    for (const layer of paper.project.layers) {
        for (const child of layer.children) {
            // don't give guides back
            if (!includeGuides && child.guide) {
                continue;
            }
            allItems.push(child);
        }
    }
    return allItems;
};

/**
 * @return {Array<paper.item>} all top-level (direct descendants of a paper.Layer) items
 *     that aren't guide items or helper items.
 */
const getAllSelectableRootItems = function () {
    const allItems = getAllRootItems();
    const selectables = [];
    for (let i = 0; i < allItems.length; i++) {
        if (allItems[i].data && !allItems[i].data.isHelperItem) {
            selectables.push(allItems[i]);
        }
    }
    return selectables;
};

const selectItemSegments = function (item, state) {
    if (item.children) {
        for (let i = 0; i < item.children.length; i++) {
            const child = item.children[i];
            if (child.children && child.children.length > 0) {
                selectItemSegments(child, state);
            } else {
                child.fullySelected = state;
            }
        }
    } else {
        for (let i = 0; i < item.segments.length; i++) {
            item.segments[i].selected = state;
        }
    }
};

const _setGroupSelection = function (root, selected, fullySelected) {
    root.fullySelected = fullySelected;
    root.selected = selected;
    // select children of compound-path or group
    if (isCompoundPath(root) || isGroup(root)) {
        const children = root.children;
        if (children) {
            for (const child of children) {
                if (isGroup(child)) {
                    _setGroupSelection(child, selected, fullySelected);
                } else {
                    child.fullySelected = fullySelected;
                    child.selected = selected;
                }
            }
        }
    }
};

const setItemSelection = function (item, state, fullySelected) {
    const parentGroup = getItemsGroup(item);
    const itemsCompoundPath = getItemsCompoundPath(item);
    
    // if selection is in a group, select group
    if (parentGroup) {
        // do it recursive
        setItemSelection(parentGroup, state, fullySelected);
    } else if (itemsCompoundPath) {
        _setGroupSelection(itemsCompoundPath, state, fullySelected);
    } else {
        if (item.data && item.data.noSelect) {
            return;
        }
        _setGroupSelection(item, state, fullySelected);
    }
    // @todo: Update toolbar state on change
    
};

const selectAllItems = function () {
    const items = getAllSelectableRootItems();
    
    for (let i = 0; i < items.length; i++) {
        setItemSelection(items[i], true);
    }
};

const selectAllSegments = function () {
    const items = getAllSelectableRootItems();
    
    for (let i = 0; i < items.length; i++) {
        selectItemSegments(items[i], true);
    }
};

/** @param {!function} dispatchClearSelect Function to update the Redux select state */
const clearSelection = function (dispatchClearSelect) {
    paper.project.deselectAll();
    // @todo: Update toolbar state on change
    dispatchClearSelect();
};

/**
 * This gets all selected non-grouped items and groups
 * (alternative to paper.project.selectedItems, which includes
 * group children in addition to the group)
 * @return {Array<paper.Item>} in increasing Z order.
 */
const getSelectedRootItems = function () {
    const allItems = getAllSelectableRootItems();
    const items = [];

    for (const item of allItems) {
        if (item.selected) {
            items.push(item);
        }
    }

    // sort items by index (0 at bottom)
    items.sort((a, b) => parseFloat(a.index) - parseFloat(b.index));
    return items;
};

/**
 * This gets all selected items that are as deeply nested as possible. Does not
 * return the parent groups.
 * @return {Array<paper.Item>} in increasing Z order.
 */
const getSelectedLeafItems = function () {
    const allItems = paper.project.selectedItems;
    const items = [];

    for (let i = 0; i < allItems.length; i++) {
        const item = allItems[i];
        if (!(item instanceof paper.Layer) && !isGroup(item) && item.data && !item.data.isSelectionBound) {
            items.push(item);
        }
    }
    items.sort(sortItemsByZIndex);
    return items;
};

/**
 * This gets all selected path segments.
 * @return {Array<paper.Segment>} selected segments
 */
const getSelectedSegments = function () {
    const selected = getSelectedLeafItems();
    const segments = [];
    for (const item of selected) {
        if (!item.segments) {
            continue;
        }
        for (const seg of item.segments) {
            if (seg.selected) {
                segments.push(seg);
            }
        }
    }
    return segments;
};

const _deleteItemSelection = function (items, onUpdateSvg) {
    // @todo: Update toolbar state on change
    if (items.length === 0) {
        return false;
    }
    for (let i = 0; i < items.length; i++) {
        items[i].remove();
    }
    onUpdateSvg();
    return true;
};

// Return true if anything was removed
const _removeSelectedSegments = function (items, onUpdateSvg) {
    const segmentsToRemove = [];
    
    for (let i = 0; i < items.length; i++) {
        if (!items[i].segments) continue;
        const segments = items[i].segments;
        for (let j = 0; j < segments.length; j++) {
            const seg = segments[j];
            if (seg.selected) {
                segmentsToRemove.push(seg);
            }
        }
    }
    
    let removedSegments = false;
    for (let i = 0; i < segmentsToRemove.length; i++) {
        const seg = segmentsToRemove[i];
        seg.remove();
        removedSegments = true;
    }
    if (removedSegments) {
        onUpdateSvg();
    }
    return removedSegments;
};

// Return whether anything was deleted
const deleteSelection = function (mode, onUpdateSvg) {
    if (mode === Modes.RESHAPE) {
        const selectedItems = getSelectedLeafItems();
        // If there are points selected remove them. If not delete the item selected.
        if (_removeSelectedSegments(selectedItems, onUpdateSvg)) {
            return true;
        }
        return _deleteItemSelection(selectedItems, onUpdateSvg);
    }
    const selectedItems = getSelectedRootItems();
    return _deleteItemSelection(selectedItems, onUpdateSvg);
};

const cloneSelection = function (recursive, onUpdateSvg) {
    const selectedItems = recursive ? getSelectedLeafItems() : getSelectedRootItems();
    for (let i = 0; i < selectedItems.length; i++) {
        const item = selectedItems[i];
        item.clone();
        item.selected = false;
    }
    onUpdateSvg();
};

const _checkBoundsItem = function (selectionRect, item, event) {
    const itemBounds = new paper.Path([
        item.localToGlobal(item.internalBounds.topLeft),
        item.localToGlobal(item.internalBounds.topRight),
        item.localToGlobal(item.internalBounds.bottomRight),
        item.localToGlobal(item.internalBounds.bottomLeft)
    ]);
    itemBounds.closed = true;
    itemBounds.guide = true;

    for (let i = 0; i < itemBounds.segments.length; i++) {
        const seg = itemBounds.segments[i];
        if (selectionRect.contains(seg.point) ||
            (i === 0 && selectionRect.getIntersections(itemBounds).length > 0)) {
            if (event.modifiers.shift && item.selected) {
                setItemSelection(item, false);

            } else {
                setItemSelection(item, true);
            }
            itemBounds.remove();
            return true;
            
        }
    }

    itemBounds.remove();
};

const _handleRectangularSelectionItems = function (item, event, rect, mode, root) {
    if (isPathItem(item)) {
        let segmentMode = false;
        
        // first round checks for segments inside the selectionRect
        for (let j = 0; j < item.segments.length; j++) {
            const seg = item.segments[j];
            if (rect.contains(seg.point)) {
                if (mode === Modes.RESHAPE) {
                    if (event.modifiers.shift && seg.selected) {
                        seg.selected = false;
                    } else {
                        seg.selected = true;
                    }
                    segmentMode = true;
                } else {
                    if (event.modifiers.shift && item.selected) {
                        setItemSelection(root, false);
                    } else {
                        setItemSelection(root, true, true /* fullySelected */);
                    }
                    return false;
                }
            }
        }

        // second round checks for path intersections
        const intersections = item.getIntersections(rect);
        if (intersections.length > 0 && !segmentMode) {
            // if in reshape mode, select the curves that intersect
            // with the selectionRect
            if (mode === Modes.RESHAPE) {
                for (let k = 0; k < intersections.length; k++) {
                    const curve = intersections[k].curve;
                    // intersections contains every curve twice because
                    // the selectionRect intersects a circle always at
                    // two points. so we skip every other curve
                    if (k % 2 === 1) {
                        continue;
                    }

                    if (event.modifiers.shift) {
                        curve.selected = !curve.selected;
                    } else {
                        curve.selected = true;
                    }
                }
            } else {
                if (event.modifiers.shift && item.selected) {
                    setItemSelection(item, false);

                } else {
                    setItemSelection(item, true);
                }
                return false;
            }
        }
        // @todo: Update toolbar state on change

    } else if (isBoundsItem(item)) {
        if (_checkBoundsItem(rect, item, event)) {
            return false;
        }
    }
    return true;
};

// if the rectangular selection found a group, drill into it recursively
const _rectangularSelectionGroupLoop = function (group, rect, root, event, mode) {
    for (let i = 0; i < group.children.length; i++) {
        const child = group.children[i];
        
        if (isGroup(child) || isCompoundPathItem(child)) {
            _rectangularSelectionGroupLoop(child, rect, root, event, mode);
        } else {
            _handleRectangularSelectionItems(child, event, rect, mode, root);
        }
    }
    return true;
};

/**
 * Called after drawing a selection rectangle in a select mode. In reshape mode, this
 * selects all control points and curves within the rectangle. In select mode, this
 * selects all items and groups that intersect the rectangle
 * @param {!MouseEvent} event The mouse event to draw the rectangle
 * @param {!paper.Rect} rect The selection rectangle
 * @param {Modes} mode The mode of the paint editor when drawing the rectangle
 */
const processRectangularSelection = function (event, rect, mode) {
    const allItems = getAllSelectableRootItems();
    
    for (let i = 0; i < allItems.length; i++) {
        const item = allItems[i];
        if (mode === Modes.RESHAPE && isPGTextItem(getRootItem(item))) {
            continue;
        }
        if (isGroup(item) || isCompoundPathItem(item)) {
            // check for item segment points inside
            _rectangularSelectionGroupLoop(item, rect, item, event, mode);
        } else {
            _handleRectangularSelectionItems(item, event, rect, mode, item);
        }
    }
};

/**
 * When switching to the select tool while having a child object of a
 * compound path selected, deselect the child and select the compound path
 * instead. (otherwise the compound path breaks because of scale-grouping)
 */
const selectRootItem = function () {
    const items = getSelectedLeafItems();
    for (const item of items) {
        if (isCompoundPathChild(item)) {
            const cp = getItemsCompoundPath(item);
            setItemSelection(cp, true, true /* fullySelected */);
        }
        const rootItem = getRootItem(item);
        if (item !== rootItem) {
            setItemSelection(rootItem, true, true /* fullySelected */);
        }
    }
};

const shouldShowSelectAll = function () {
    return paper.project.getItems({class: paper.PathItem}).length > 0;
};

export {
    getItems,
    getAllRootItems,
    selectAllItems,
    selectAllSegments,
    clearSelection,
    deleteSelection,
    cloneSelection,
    setItemSelection,
    getSelectedLeafItems,
    getSelectedRootItems,
    getSelectedSegments,
    processRectangularSelection,
    selectRootItem,
    shouldShowSelectAll
};
