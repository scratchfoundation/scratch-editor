import paper from 'paper';
import {getRootItem, isGroupItem} from './item';
import {clearSelection, getSelectedItems, setItemSelection} from './selection';

const isGroup = function (item) {
    return isGroupItem(item);
};

const groupSelection = function () {
    const items = getSelectedItems();
    if (items.length > 0) {
        const group = new paper.Group(items);
        clearSelection();
        setItemSelection(group, true);
        for (let i = 0; i < group.children.length; i++) {
            group.children[i].selected = true;
        }
        // @todo: Set selection bounds; enable/disable grouping icons
        // @todo add back undo
        // pg.undo.snapshot('groupSelection');
        return group;
    }
    return false;
};

const ungroupLoop = function (group, recursive) {
    // don't ungroup items that are not groups
    if (!group || !group.children || !isGroup(group)) return;
            
    group.applyMatrix = true;
    // iterate over group children recursively
    for (let i = 0; i < group.children.length; i++) {
        const groupChild = group.children[i];
        if (groupChild.hasChildren()) {
            // recursion (groups can contain groups, ie. from SVG import)
            if (recursive) {
                ungroupLoop(groupChild, true /* recursive */);
                continue;
            }
        }
        groupChild.applyMatrix = true;
        // move items from the group to the activeLayer (ungrouping)
        groupChild.insertBelow(group);
        groupChild.selected = true;
        i--;
    }
};

// ungroup items (only top hierarchy)
const ungroupItems = function (items) {
    clearSelection();
    const emptyGroups = [];
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (isGroup(item) && !item.data.isPGTextItem) {
            ungroupLoop(item, false /* recursive */);

            if (!item.hasChildren()) {
                emptyGroups.push(item);
            }
        }
    }

    // remove all empty groups after ungrouping
    for (let j = 0; j < emptyGroups.length; j++) {
        emptyGroups[j].remove();
    }
    // @todo: Set selection bounds; enable/disable grouping icons
    // @todo add back undo
    // pg.undo.snapshot('ungroupItems');
};

const ungroupSelection = function () {
    const items = getSelectedItems();
    ungroupItems(items);
};


const groupItems = function (items) {
    if (items.length > 0) {
        const group = new paper.Group(items);
        // @todo: Set selection bounds; enable/disable grouping icons
        // @todo add back undo
        // pg.undo.snapshot('groupItems');
        return group;
    }
    return false;
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
    const items = getSelectedItems();
    return items.length > 1;
};

const shouldShowUngroup = function () {
    const items = getSelectedItems();
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
