import paper from '@scratch/paper';
import {isBoundsItem, getRootItem} from './item';
import {hoverBounds, hoverItem} from './guides';
import {isGroupChild} from './group';
import {sortItemsByZIndex} from './math';

/**
 * @param {!MouseEvent} event mouse event
 * @param {?object} hitOptions hit options to use
 * @param {?boolean} subselect Whether items within groups can be hovered. If false, the
 *    entire group should be hovered.
 * @returns {paper.Item} the hovered item or null if there is none
 */
const getHoveredItem = function (event, hitOptions, subselect) {
    const oldMatch = hitOptions.match;
    hitOptions.match = hitResult => {
        if (hitResult.item.data && hitResult.item.data.noHover) return false;
        return oldMatch ? oldMatch(hitResult) : true;
    };
    const hitResults = paper.project.hitTestAll(event.point, hitOptions);
    if (hitResults.length === 0) {
        return null;
    }

    // Get highest z-index result
    let hitResult;
    for (const result of hitResults) {
        if (!hitResult || sortItemsByZIndex(hitResult.item, result.item) < 0) {
            hitResult = result;
        }
    }
    const item = hitResult.item;
    // If the hovered item is already selected, then there should be no hovered item.
    if (!item || item.selected) {
        return null;
    }

    let hoverGuide;
    if (isBoundsItem(item)) {
        hoverGuide = hoverBounds(item);
    } else if (!subselect && isGroupChild(item)) {
        hoverGuide = hoverBounds(getRootItem(item));
    } else {
        hoverGuide = hoverItem(item);
    }
    hoverGuide.data.hitResult = hitResult;

    return hoverGuide;
};

export {
    getHoveredItem
};
