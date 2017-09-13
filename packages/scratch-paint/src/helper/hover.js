import paper from 'paper';
import {isBoundsItem, getRootItem} from './item';
import {hoverBounds, hoverItem} from './guides';
import {isGroupChild} from './group';

/**
 * @param {!MouseEvent} event mouse event
 * @param {?object} hitOptions hit options to use
 * @return {paper.Item} the hovered item or null if there is none
 */
const getHoveredItem = function (event, hitOptions) {
    const hitResults = paper.project.hitTestAll(event.point, hitOptions);
    if (hitResults.length === 0) {
        return null;
    }

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
    } else if (isGroupChild(hitResult.item)) {
        return hoverBounds(getRootItem(hitResult.item));
    }
    return hoverItem(hitResult);
};

export {
    getHoveredItem
};
