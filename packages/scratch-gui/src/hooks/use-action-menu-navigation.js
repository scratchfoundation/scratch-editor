import {useCallback, useState, useRef, useEffect} from 'react';
import {KEY} from '../lib/navigation-keys';
import ReactTooltip from 'react-tooltip';

const MENU_ITEM_SELECTOR = '[data-action-menu-item="true"]';

/**
 * Custom hook to handle keyboard and focus navigation for an action menu.
 * Supports focusing menu items, navigating with arrow keys, and closing the menu on outside clicks.
 * Also provides refs for the menu container and the main button.
 * @param {object} [options] - Optional configuration object.
 * @param {number|null} [options.defaultItemIndex] - The index of the menu item to focus by default when
 * the menu receives focus. If `null`, the last menu item will be focused.
 * @returns {object} Navigation helpers and refs for use in an action menu component.
 * - containerRef - Ref to the container element that holds all menu items.
 * - buttonRef - Ref to the main action button.
 * - isExpanded - Current expanded state of the menu.
 * - setIsExpanded - Setter to manually expand/collapse the menu.
 * - handleKeyDown - Keydown handler to navigate through menu items with arrow keys and handle tab.
 * - handleOnFocus - Focus handler to expand the menu and focus the default item.
 */
export default function useActionMenuNavigation (
    {defaultItemIndex = null} = {}
) {
    const containerRef = useRef(null);
    const buttonRef = useRef(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const skipNextBlurRef = useRef(false);

    useEffect(() => {
        if (!isExpanded) {
            if (skipNextBlurRef.current) {
                // Skip the blur this time
                skipNextBlurRef.current = false;
                return;
            }
            // If menu is closed, blur any focused element to prevent keyboard events from affecting it
            if (document.activeElement !== document.body) {
                document.activeElement.blur();
            }
            
            buttonRef?.current?.blur();
        }
    }, [isExpanded, buttonRef, skipNextBlurRef]);

    // Handle clicks/touches outside to close menu
    useEffect(() => {
        const handleTouchOutside = e => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsExpanded(false);
                ReactTooltip.hide();
            }
        };

        document.addEventListener('mousedown', handleTouchOutside);
        return () => {
            document.removeEventListener('mousedown', handleTouchOutside);
        };
    }, [containerRef, setIsExpanded]);

    // BFS to find first children with attribute
    const findSubitems = useCallback(() => {
        if (!containerRef?.current) return [];
        const subitems = [];
        const root = containerRef.current;
        const children = [...root.children];

        while (children.length > 0) {
            // if child is a menu item itself
            const element = children.shift();
            if (element.matches(MENU_ITEM_SELECTOR)) {
                subitems.push(element);
            } else {
                children.push(...element.children);
            }
        }

        return subitems;
    }, [containerRef]);

    const focusItem = useCallback(item => {
        if (item) {
            item.focus();
        }
    }, []);

    const handleOnFocus = useCallback(() => {
        setIsExpanded(true);
        const items = findSubitems();
        if (!items.length) return;

        // default to last item (first above)
        const defaultItem = items[defaultItemIndex] ?? items[items.length - 1];
        focusItem(defaultItem);
        // TODO: refresh tooltip so it repositions correctly
    }, [findSubitems, focusItem, setIsExpanded]);

    const handleMove = useCallback(direction => {
        const items = findSubitems();
        if (!items.length) return;

        const currentIndex = items.indexOf(document.activeElement);
        const nextIndex = (currentIndex + direction + items.length) % items.length;
        focusItem(items[nextIndex]);
    }, [findSubitems, focusItem]);

    const handleKeyDown = useCallback(e => {
        switch (e.key) {
        case KEY.ARROW_DOWN:
            e.preventDefault();
            handleMove(1);
            break;
        case KEY.ARROW_UP:
            e.preventDefault();
            handleMove(-1);
            break;
        case KEY.TAB:
            setIsExpanded(false);
            // A little bit hacky logic for shift + tab to move focus to previous element
            if (e.shiftKey) {
                e.preventDefault();
                const focusables = Array.from(
                    document.querySelectorAll('a, button, input, select, textarea, [tabindex]')
                );

                const filteredFocusables = focusables.filter(el => {
                    // Skip disabled, hidden, or tabindex=-1
                    if (el.disabled) return false;
                    if (el.offsetParent === null) return false;
                    const tabindex = el.getAttribute('tabindex');
                    if (tabindex === '-1') return false;
                    return true;
                });
                const currentIndex = filteredFocusables.indexOf(buttonRef.current);
                if (currentIndex > 0) {
                    filteredFocusables[currentIndex - 1].focus();
                }

                skipNextBlurRef.current = true;
            }
            return;
        }
    }, [handleMove, isExpanded, setIsExpanded]);

    return {
        containerRef,
        buttonRef,
        isExpanded,
        setIsExpanded,
        handleKeyDown,
        handleOnFocus
    };
}
