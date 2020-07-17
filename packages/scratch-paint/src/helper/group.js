import paper from '@scratch/paper';
import {getRootItem, isGroupItem} from './item';
import {clearSelection, getSelectedRootItems, setItemSelection} from './selection';

const isGroup = function (item) {
    return isGroupItem(item);
};

/**
 * Groups the given items. Other things are then deselected and the new group is selected.
 * @param {!Array<paper.Item>} items Root level items to group
 * @param {!function} clearSelectedItems Function to clear Redux state's selected items
 * @param {!function} setSelectedItems Function to set Redux state with new list of selected items
 * @param {!function} onUpdateImage Function to let listeners know that SVG has changed.
 * @return {paper.Group} the group if one is created, otherwise false.
 */
const groupItems = function (items, clearSelectedItems, setSelectedItems, onUpdateImage) {
    if (items.length > 0) {
        const group = new paper.Group(items);
        clearSelection(clearSelectedItems);
        setItemSelection(group, true);
        for (let i = 0; i < group.children.length; i++) {
            group.children[i].selected = true;
        }
        setSelectedItems();
        onUpdateImage();
        return group;
    }
    return false;
};

/**
 * Groups the selected items. Other things are then deselected and the new group is selected.
 * @param {!function} clearSelectedItems Function to clear Redux state's selected items
 * @param {!function} setSelectedItems Function to set Redux state with new list of selected items
 * @param {!function} onUpdateImage Function to let listeners know that SVG has changed.
 * @return {paper.Group} the group if one is created, otherwise false.
 */
const groupSelection = function (clearSelectedItems, setSelectedItems, onUpdateImage) {
    const items = getSelectedRootItems();
    return groupItems(items, clearSelectedItems, setSelectedItems, onUpdateImage);
};

const _ungroupLoop = function (group, recursive, setSelectedItems) {
    // Can't ungroup items that are not groups
    if (!group || !group.children || !isGroup(group)) return;
            
    group.applyMatrix = true;
    // iterate over group children recursively
    for (let i = 0; i < group.children.length; i++) {
        let groupChild = group.children[i];
        if (groupChild instanceof paper.Group && groupChild.hasChildren()) {
            // recursion (groups can contain groups, ie. from SVG import)
            if (recursive) {
                _ungroupLoop(groupChild, recursive, setSelectedItems);
                continue;
            }
            if (groupChild.children.length === 1) {
                groupChild = groupChild.reduce();
            }
        }
        groupChild.applyMatrix = true;
        // move items from the group to the activeLayer (ungrouping)
        groupChild.insertBelow(group);
        if (setSelectedItems) {
            groupChild.selected = true;
        }
        i--;
    }
};

/**
 * Ungroups the given items. The new group is selected only if setSelectedItems is passed in.
 * onUpdateImage is called to notify listeners of a change on the SVG only if onUpdateImage is passed in.
 * The reason these arguments are optional on ungroupItems is because ungroupItems is used for parts of
 * SVG import, which shouldn't change the selection or undo state.
 *
 * @param {!Array<paper.Item>} items Items to ungroup if they are groups
 * @param {?function} setSelectedItems Function to set Redux state with new list of selected items
 * @param {?function} onUpdateImage Function to let listeners know that SVG has changed.
 */
const ungroupItems = function (items, setSelectedItems, onUpdateImage) {
    if (items.length === 0) {
        return;
    }
    const emptyGroups = [];
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (isGroup(item) && !item.data.isPGTextItem) {
            _ungroupLoop(item, false /* recursive */, setSelectedItems);

            if (!item.hasChildren()) {
                emptyGroups.push(item);
            }
        } else if (setSelectedItems) {
            item.selected = true;
        }
    }
    if (setSelectedItems) {
        setSelectedItems();
    }
    // remove all empty groups after ungrouping
    for (let j = 0; j < emptyGroups.length; j++) {
        emptyGroups[j].remove();
    }
    // @todo: enable/disable grouping icons
    if (onUpdateImage) {
        onUpdateImage();
    }
};

/**
 * Ungroups the selected items. Other items are deselected and the ungrouped items are selected.
 *
 * @param {!function} clearSelectedItems Function to clear Redux state's selected items
 * @param {!function} setSelectedItems Function to set Redux state with new list of selected items
 * @param {!function} onUpdateImage Function to let listeners know that SVG has changed.
 */
const ungroupSelection = function (clearSelectedItems, setSelectedItems, onUpdateImage) {
    const items = getSelectedRootItems();
    clearSelection(clearSelectedItems);
    ungroupItems(items, setSelectedItems, onUpdateImage);
};

const getItemsGroup = function (item) {
    const itemParent = item.parent;

    if (isGroup(itemParent)) {
        return itemParent;
    }
    return null;
};

const isGroupChild = function (item) {
    const rootItem = getRootItem(item);
    return isGroup(rootItem);
};

const shouldShowGroup = function () {
    const items = getSelectedRootItems();
    return items.length > 1;
};

const shouldShowUngroup = function () {
    const items = getSelectedRootItems();
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (isGroup(item) && !item.data.isPGTextItem && item.children && item.children.length > 0) {
            return true;
        }
    }
    return false;
};

export {
    groupSelection,
    ungroupSelection,
    groupItems,
    ungroupItems,
    getItemsGroup,
    isGroup,
    isGroupChild,
    shouldShowGroup,
    shouldShowUngroup
};
