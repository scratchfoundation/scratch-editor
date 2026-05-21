import React, {useCallback, useMemo, useState} from 'react';
import PropTypes from 'prop-types';

export const MenuRefContext = React.createContext(null);

/**
 * This provider manages references to menu components in order to ensure
 * sensible behavior for handling menu opening and closing logic
 * @param {object} props
 *   Provider props.
 * @param {React.ReactNode} props.children
 *   Child components that use the logic of the provider.
 * @returns {React.ReactNode}
 *   A MenuRefContext provider exposing:
 *   - refStack: Array of currently opened menus one after the other
 *   - openInnerMenu(ref, depth)
 *     Adds menu at said depth, closing any inner menus that followed previously.
 *   - closeMenuByRef(ref)
 *     Closes the specified menu and all menus nested in it.
 *   - closeInnerMenu()
 *     Closes only the current innermost menu.
 *   - closeAllMenus()
 *     Closes all open menus.
 *   - isOpenMenu(ref)
 *     Returns if the given menu is currently open.
 *   - isInnermostMenu(ref)
 *     Returns if the given menu is currently the innermost one.
 *   - outermostMenu
 *     Returns ref of the outermost open menu.
 */
export const MenuRefProvider = ({children}) => {
    const [refStack, setRefStack] = useState([]);

    const closeMenuByRef = useCallback(ref => {
        setRefStack(prev => {
            const index = prev.indexOf(ref);
            if (index === -1) return prev;
            return prev.slice(0, index);
        });
    }, []);

    const openInnerMenu = useCallback((ref, depth) => {
        setRefStack(prev => {
            let next = prev;

            if (depth <= prev.length) {
                const cutRef = prev[depth - 1];
                const index = prev.indexOf(cutRef);
                if (index !== -1) {
                    next = prev.slice(0, index);
                }
            }

            return [...next, ref];
        });
    }, []);
    
    const closeInnerMenu = useCallback(() => {
        setRefStack(prev => prev.slice(0, prev.length - 1));
    }, []);

    const closeAllMenus = useCallback(() => {
        setRefStack([]);
    }, []);

    const outermostMenu = useMemo(() => (refStack.length > 0 ? refStack[0] : null), [refStack]);

    const isInnermostMenu = useCallback(ref => refStack.length > 0 &&
        refStack[refStack.length - 1] === ref, [refStack]);

    const isOutermostMenu = useCallback(ref => refStack.length > 0 &&
        refStack[0] === ref, [refStack]);

    const isOpenMenu = useCallback(ref => refStack.includes(ref), [refStack]);

    const value = useMemo(() => ({
        refStack,
        openInnerMenu,
        closeInnerMenu,
        closeMenuByRef,
        closeAllMenus,
        isInnermostMenu,
        isOutermostMenu,
        isOpenMenu,
        outermostMenu
    }), [
        refStack,
        openInnerMenu,
        closeInnerMenu,
        closeMenuByRef,
        closeAllMenus,
        isInnermostMenu,
        isOutermostMenu,
        isOpenMenu,
        outermostMenu
    ]);

    return (
        <MenuRefContext.Provider value={value}>
            {children}
        </MenuRefContext.Provider>
    );
};

MenuRefProvider.propTypes = {
    children: PropTypes.node
};
