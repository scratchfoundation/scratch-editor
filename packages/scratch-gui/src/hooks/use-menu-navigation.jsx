import {useCallback, useContext, useState, useEffect} from 'react';
import {MenuRefContext} from '../contexts/menu-ref-context';

const KEY = {
    ARROW_UP: 'ArrowUp',
    ARROW_DOWN: 'ArrowDown',
    ARROW_LEFT: 'ArrowLeft',
    ARROW_RIGHT: 'ArrowRight',
    ESCAPE: 'Escape',
    TAB: 'Tab',
    SPACE: ' '
};

/**
 * Provides keyboard navigation and focus management logic for menu components.
 *
 * This hook encapsulates shared menu behavior such as:
 * - opening and closing menus
 * - moving focus between menu items with arrow keys
 * - handling Escape, Enter, and Tab behavior
 * - coordinating open menus via MenuRefContext
 * STEPS TO USE IT:
 * ______________________________________________________________________________________
 * 1. Define itemRefs as an array of refs for the submenu items, then pass
 * {itemRefs, menuRef (ref for component itself) and depth (starting from 1 for )}
 * 2. In the top component (button/div/...) pass
 * - onClick={handleOnOpen}
 * - ref={menuRef}
 * - onKeyDown={handleKeyPress}
 * - tabIndex={0} if it's the core menu accessible via tab or tabIndex={1} if it's a submenu
 * - aria-expanded={isExpanded()} (also everywhere else where you require isExpanded() logic,
 * such as the css responsible for conditionally displaying the dropdown)
 * 3. In the submenu items pass:
 * - itemRef={itemRefs[index]}
 * - onParentKeyPress={handleKeyPressOpenMenu}
 * ______________________________________________________________________________________
 * @param {object} params
 *  Parameters object
 * @param {{ current: HTMLElement | null }} params.menuRef
 *   Ref to the menu trigger or container element.
 * @param {Array<{ current: HTMLElement | null }>} params.itemRefs
 *   Refs for each focusable menu item, in display order.
 * @param {number} params.depth
 *   Nesting depth of the menu (1 = top-level menu).
 * @param {number} params.defaultIndexOnOpen
 *   Default menu item index to open to
 * @returns {object} An object containing the focused index, menu state, and keyboard handlers:
 *   - focusedIndex: number — Index of the currently focused menu item.
 *   - isExpanded: function() — Returns true if the menu is expanded.
 *   - handleKeyPress: function(KeyboardEvent) — Handler for key presses on the menu.
 *   - handleKeyPressOpenMenu: function(KeyboardEvent) — Handler for key presses when the menu is open.
 *   - handleOnOpen: function() — Function to open the menu.
 *   - handleOnClose: function() — Function to close the menu.
 */
export default function useMenuNavigation ({
    menuRef,
    itemRefs,
    depth,
    defaultIndexOnOpen = 0
}) {
    const menuContext = useContext(MenuRefContext);
    const [focusedIndex, setFocusedIndex] = useState(-1);

    const refocusRef = useCallback(ref => {
        if (ref?.current) {
            ref.current.focus();
        }
    }, []);

    useEffect(() => {
        if (focusedIndex >= 0) {
            refocusRef(itemRefs[focusedIndex]);
        }
    }, [focusedIndex, refocusRef]);

    const isExpanded = useCallback(
        () => menuContext.isOpenMenu(menuRef),
        [menuContext, menuRef]
    );

    const handleOnOpen = useCallback(() => {
        if (menuContext.isOpenMenu(menuRef)) return;

        menuContext.openInnerMenu(menuRef, depth);
        setFocusedIndex(defaultIndexOnOpen);
    }, [menuContext, menuRef, depth, defaultIndexOnOpen]);

    const handleOnClose = useCallback(() => {
        setFocusedIndex(-1);
        menuContext.closeMenuByRef(menuRef);
        refocusRef(menuRef);
    }, [menuContext, menuRef, refocusRef]);

    const handleMove = useCallback(direction => {
        // Calculate the next focused menu item index based on the direction.
        // Wraps around the list so that moving past the first or last item
        // loops to the other end, preventing out-of-bounds errors.
        const nextIndex =
            (focusedIndex + direction + itemRefs.length) %
            itemRefs.length;

        setFocusedIndex(nextIndex);
    }, [focusedIndex, itemRefs]);

    const handleKeyPressOpenMenu = useCallback(e => {
        // Logic for vertical menus, will need to change when implementing for vertical
        if (e.key === KEY.ARROW_DOWN) {
            e.preventDefault();
            handleMove(1);
        }
        if (e.key === KEY.ARROW_UP) {
            e.preventDefault();
            handleMove(-1);
        }
        if (e.key === KEY.ARROW_LEFT || e.key === KEY.ESCAPE) {
            e.preventDefault();
            handleOnClose();
        }
    }, [handleMove, handleOnClose]);

    const handleKeyPress = useCallback(e => {
        if (isExpanded() && depth === 1 && e.key === KEY.TAB) {
            handleOnClose();
            menuContext.closeAllMenus();
        }

        if (menuContext.isInnermostMenu(menuRef)) {
            handleKeyPressOpenMenu(e);
        } else if (!isExpanded() && (e.key === KEY.SPACE || (e.key === KEY.ARROW_RIGHT && depth !== 1))) {
            e.preventDefault();
            handleOnOpen();
        }
    }, [
        depth,
        menuContext,
        menuRef,
        isExpanded,
        handleKeyPressOpenMenu,
        handleOnOpen,
        handleOnClose
    ]);

    return {
        focusedIndex,
        isExpanded,
        handleKeyPress,
        handleKeyPressOpenMenu,
        handleOnOpen,
        handleOnClose,
        refocusRef
    };
}
