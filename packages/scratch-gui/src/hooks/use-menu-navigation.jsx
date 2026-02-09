import {useCallback, useContext, useRef} from 'react';
import {useSelector} from 'react-redux';
import {MenuRefContext} from '../contexts/menu-ref-context';
import {KEY} from '../lib/navigation-keys';

// TODO: consider refactoring all menus to follow the structure
// of having the submenu nested inside the button

// for all items of menu, to be found via the custom algorithm
const MENU_ITEM_SELECTOR = '[data-menu-item="true"]';
// wrapper prop should only be used for wrappers of an expandable menu,
// where the submenu containings its items are its sibling, instead of child
const MENU_ITEM_WRAPPER_SELECTOR = '[data-menu-item-wrapper="true"]';

/**
 * Custom hook for keyboard navigation and focus management in menu components.
 *
 * This hook provides:
 * - Opening and closing menus, remembering state
 * - Handling Escape, Enter, Space, Arrow and Tab keys
 * - Coordinating nested open menus via MenuRefContext
 * - Automatically focusing the first or default menu item on open
 *
 * STEPS TO USE IT:
 * 1. In the top-level menu trigger (button/div/...) pass:
 * - onClick={handleOnOpen}
 * - ref={menuRef}
 * - onKeyDown={handleKeyDown}
 * - Make sure the element is focusable
 * - aria-expanded={isExpanded()} (and use it wherever else needed)
 * - for menu items pass onKeyDown={handleKeyDownOpenMenu}
 * 2. For the sake of consistent code structure, it is recommended for the core menus (depth 1)
 * to nest the submenu as a child of the button.
 * 3. Data-menu-item and data-menu-item-wrapper
 * - For nested submenus, you could use either a standalone button with menu items as children
 * and give it data-menu-item(=true) prop or
 * - Give data-menu-item-wrapper to the wrapper and data-menu-item to the button directly inside it.
 * See SettingsMenu -> LanguageMenu | PreferenceMenu logic for reference
 * @param {object} params
 *   Parameters object
 * @param {number} params.depth
 *   Nesting depth of the menu (1 = top-level menu).
 * @param {number} [params.defaultIndexOnOpen]
 *   Default menu item index to focus when opening the menu.
 * @param {boolean} [params.isRtl]
 *   Determines the direction of the arrow navigation
 * @returns {object} An object containing the menu state and keyboard handlers:
 *   - menuRef: reference to element to be used in component
 *   - focusedIndex: number — Index of the currently focused menu item.
 *   - isExpanded: function() — Returns true if the menu is expanded.
 *   - handleKeyDown: function(KeyboardEvent) — Handles key presses on the menu.
 *   - handleKeyDownOpenMenu: function(KeyboardEvent) — Handles key presses when the menu is open.
 *   - handleOnOpen: function() — Function to open the menu.
 *   - handleOnClose: function() — Function to close the menu.
 */
export default function useMenuNavigation ({
    depth = 1,
    defaultIndexOnOpen = 0,
    isRtl: isRtlProp
}) {
    const menuRef = useRef(null);
    const menuContext = useContext(MenuRefContext);

    const isRtlFromStore = useSelector(state => state.locales.isRtl);
    const isRtl = isRtlProp ?? isRtlFromStore;

    const OPEN_KEY = isRtl ? KEY.ARROW_LEFT : KEY.ARROW_RIGHT;
    const CLOSE_KEY = isRtl ? KEY.ARROW_RIGHT : KEY.ARROW_LEFT;

    // BFS to find first children with attribute
    const findDirectSubitems = useCallback(() => {
        if (!menuRef?.current) return [];
        const directSubitems = [];
        const root = menuRef.current;
        const children = [...root.children];

        while (children.length > 0) {
            // if child is a menu item itself
            const element = children.shift();
            if (element.matches(MENU_ITEM_SELECTOR)) {
                // Skip original starting element if we went back to the wrapper
                if (!(root.matches(MENU_ITEM_WRAPPER_SELECTOR) &&
                    Array.from(root.children).includes(element))) {
                    directSubitems.push([element, element]);
                }
                continue;
            }
            if (element.matches(MENU_ITEM_WRAPPER_SELECTOR)) {
                const wrappedItems = Array.from(element.children).filter(child =>
                    child.matches(MENU_ITEM_SELECTOR)
                );
                wrappedItems.forEach(child => {
                    directSubitems.push([element, child]);
                });
            } else {
                children.push(...element.children);
            }
        }

        return directSubitems;
    }, [menuRef]);

    const findDirectSubitemsFocusable = useCallback(
        () => findDirectSubitems().map(([wrapper]) => wrapper),
        [findDirectSubitems]
    );

    const findDirectSubitemsClickable = useCallback(
        () => findDirectSubitems().map(([wrapper, child]) => child),
        [findDirectSubitems]
    );

    const isExpanded = useCallback(
        () => menuContext.isOpenMenu(menuRef),
        [menuContext, menuRef]
    );

    const focusItem = useCallback(item => {
        if (item) {
            item.focus();
        }
    }, []);

    const handleOnOpen = useCallback(() => {
        if (menuContext.isOpenMenu(menuRef)) return;

        menuContext.openInnerMenu(menuRef, depth);

        // Wait for the UI to be rendered before interacting with the DOM
        requestAnimationFrame(() => {
            const focusableItems = findDirectSubitemsFocusable();
            focusItem(focusableItems[defaultIndexOnOpen] || focusableItems[0]);
        });
    }, [menuContext, menuRef, depth, defaultIndexOnOpen]);

    /**
     * Closes the menu and restores focus to the appropriate element.
     * - If the menuRef is a wrapper (data-menu-item-wrapper), tries to focus its direct child
     *   with data-menu-item (usually the button that opened the submenu).
     * - Otherwise, focuses the wrapper itself (if focusable).
     * This ensures keyboard users return to the correct menu trigger after closing a submenu.
     */
    const handleOnClose = useCallback(menuRefToClose => {
        const ref = menuRefToClose || menuRef;
        menuContext.closeMenuByRef(ref);
        ref?.current?.focus();
    }, [menuContext, menuRef]);

    const handleOnCloseAllMenus = useCallback(() => {
        handleOnClose(menuContext.outermostMenu);
        menuContext.closeAllMenus();
    }, [handleOnClose, menuContext]);

    const handleMove = useCallback(direction => {
        const items = findDirectSubitemsFocusable();
        if (!items.length) return;

        const currentIndex = items.indexOf(document.activeElement);
        const nextIndex = (currentIndex + direction + items.length) % items.length;
        focusItem(items[nextIndex]);
    }, [menuRef, focusItem]);

    const handleKeyDownOpenMenu = useCallback(e => {
        // Logic for vertical menus, will need to change when implementing for horizontal
        switch (e.key) {
        case KEY.ARROW_DOWN:
            e.preventDefault();
            e.stopPropagation();
            handleMove(1);
            break;
        case KEY.ARROW_UP:
            e.preventDefault();
            e.stopPropagation();
            handleMove(-1);
            break;
        case KEY.ESCAPE:
        case CLOSE_KEY:
            e.preventDefault();
            e.stopPropagation();
            handleOnClose();
            break;
        case KEY.ENTER:
            e.preventDefault();
            e.stopPropagation();
            {
                const focusableItems = findDirectSubitemsFocusable();
                const clickableItems = findDirectSubitemsClickable();
                
                const index = focusableItems.indexOf(document.activeElement);
                if (index >= 0 && clickableItems[index]) {
                    clickableItems[index].click();
                }
                break;
            }
        case KEY.TAB:
            handleOnCloseAllMenus();
            break;
        }

    }, [handleMove, handleOnClose, handleOnCloseAllMenus]);

    const handleKeyDown = useCallback(e => {
        if (isExpanded() && e.key === KEY.TAB) {
            handleOnCloseAllMenus();
            return;
        }

        if (menuContext.isInnermostMenu(menuRef)) {
            handleKeyDownOpenMenu(e);
        } else if (!isExpanded() &&
            (
                e.key === KEY.ENTER ||
                e.key === KEY.SPACE ||
                (e.key === OPEN_KEY && depth !== 1)
            )
        ) {
            e.preventDefault();
            handleOnOpen();
        }
    }, [
        depth,
        menuContext,
        menuRef,
        isExpanded,
        handleKeyDownOpenMenu,
        handleOnOpen,
        handleOnClose
    ]);

    return {
        menuRef,
        isExpanded,
        handleKeyDown,
        handleKeyDownOpenMenu,
        handleOnOpen,
        handleOnClose
    };
}
