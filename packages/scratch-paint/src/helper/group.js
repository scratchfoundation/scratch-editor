import paper from '@scratch/paper';
import {getRootItem, isGroupItem} from './item';
import {clearSelection, getSelectedRootItems, setItemSelection} from './selection';

const isGroup = function (item) {
    return isGroupItem(item);
};

const groupSelection = function (clearSelectedItems) {
    const items = getSelectedRootItems();
    if (items.length > 0) {
        const group = new paper.Group(items);
        clearSelection(clearSelectedItems);
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

const ungroupLoop = function (group, recursive, selectUngroupedItems) {
    // Can't ungroup items that are not groups
    if (!group || !group.children || !isGroup(group)) return;
            
    group.applyMatrix = true;
    // iterate over group children recursively
    for (let i = 0; i < group.children.length; i++) {
        let groupChild = group.children[i];
        if (groupChild.hasChildren()) {
            // recursion (groups can contain groups, ie. from SVG import)
            if (recursive) {
                ungroupLoop(groupChild, recursive, selectUngroupedItems);
                continue;
            }
            if (groupChild.children.length === 1) {
                groupChild = groupChild.reduce();
            }
        }
        groupChild.applyMatrix = true;
        // move items from the group to the activeLayer (ungrouping)
        groupChild.insertBelow(group);
        if (selectUngroupedItems) {
            groupChild.selected = true;
        }
        i--;
    }
};

// ungroup items (only top hierarchy)
const ungroupItems = function (items, selectUngroupedItems) {
    const emptyGroups = [];
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (isGroup(item) && !item.data.isPGTextItem) {
            ungroupLoop(item, false /* recursive */, selectUngroupedItems /* selectUngroupedItems */);

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

const ungroupSelection = function (clearSelectedItems) {
    const items = getSelectedRootItems();
    clearSelection(clearSelectedItems);
    ungroupItems(items, true /* selectUngroupedItems */);
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
