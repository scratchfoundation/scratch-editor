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
 * @return {paper.Item} the hovered item or null if there is none
 */
const getHoveredItem = function (event, hitOptions, subselect) {
    // @todo make hit test only hit painting layer
    const hitResults = paper.project.hitTestAll(event.point, hitOptions);
    if (hitResults.length === 0) {
        return null;
    }

    // sort items by index
    const items = [];
    for (const hitResult of hitResults) {
        items.push(hitResult.item);
    }
    items.sort(sortItemsByZIndex);

    let hitResult;
    for (const result of hitResults) {
        if (!(result.item.data && result.item.data.noHover) && !result.item.selected) {
            hitResult = result;
            break;
        }
    }
    if (!hitResult) {
        return null;
    }

    if (isBoundsItem(hitResult.item)) {
        return hoverBounds(hitResult.item);
    } else if (!subselect && isGroupChild(hitResult.item)) {
        return hoverBounds(getRootItem(hitResult.item));
    }
    return hoverItem(hitResult);
};

export {
    getHoveredItem
};
