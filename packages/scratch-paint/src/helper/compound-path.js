const isCompoundPath = function (item) {
    return item && item.className === 'CompoundPath';
};

const isCompoundPathChild = function (item) {
    if (item.parent) {
        return item.parent.className === 'CompoundPath';
    }
    return false;
};


const getItemsCompoundPath = function (item) {
    const itemParent = item.parent;

    if (isCompoundPath(itemParent)) {
        return itemParent;
    }
    return null;
    
};

export {
    isCompoundPath,
    isCompoundPathChild,
    getItemsCompoundPath
};
