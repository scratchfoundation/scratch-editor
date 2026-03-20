import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import styles from './menu.css';

const MenuComponent = React.forwardRef(({
    className = '',
    children,
    place = 'right'
}, ref) => (
    <ul
        className={classNames(
            styles.menu,
            className,
            {
                [styles.left]: place === 'left',
                [styles.right]: place === 'right'
            }
        )}
        ref={ref}
    >
        {children}
    </ul>
));

MenuComponent.displayName = 'MenuComponent';

MenuComponent.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    place: PropTypes.oneOf(['left', 'right'])
};

const Submenu = ({children, className, place, ...props}) => (
    <ul
        className={classNames(
            styles.submenu,
            className,
            {
                [styles.left]: place === 'left',
                [styles.right]: place === 'right'
            }
        )}
    >
        <MenuComponent
            place={place}
            {...props}
        >
            {children}
        </MenuComponent>
    </ul>
);

Submenu.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    place: PropTypes.oneOf(['left', 'right'])
};

const MenuItem = React.forwardRef(({
    children,
    className,
    isExpanded = false,
    isSelected = false,
    isDisabled = false,
    isDataMenuItem = false,
    isDataMenuItemWrapper = false,
    onClick,
    ariaLabel,
    ariaRole,
    onParentKeyDown,
    ...props
}, ref) => (
    <li
        ref={ref}
        className={classNames(
            styles.menuItem,
            styles.hoverable,
            className,
            {[styles.expanded]: isExpanded}
        )}
        onClick={onClick}
        tabIndex={-1}
        aria-label={ariaLabel}
        aria-selected={isSelected}
        aria-disabled={isDisabled}
        role={ariaRole}
        onKeyDown={onParentKeyDown}
        data-menu-item={isDataMenuItem}
        data-menu-item-wrapper={isDataMenuItemWrapper}
        {...props}
    >
        {children}
    </li>
));

MenuItem.displayName = 'MenuItem';

MenuItem.propTypes = {
    ariaLabel: PropTypes.string,
    ariaRole: PropTypes.string,
    children: PropTypes.node,
    className: PropTypes.string,
    isExpanded: PropTypes.bool,
    isSelected: PropTypes.bool,
    isDisabled: PropTypes.bool,
    isDataMenuItem: PropTypes.bool,
    isDataMenuItemWrapper: PropTypes.bool,
    onClick: PropTypes.func,
    onParentKeyDown: PropTypes.func
};

const addDividerClassToFirstChild = (child, id) => (
    child && React.cloneElement(child, {
        className: classNames(
            child.className,
            {[styles.menuSection]: id === 0}
        ),
        key: id
    })
);

const MenuSection = ({children}) => (
    <React.Fragment>{
        React.Children.map(children, addDividerClassToFirstChild)
    }</React.Fragment>
);

MenuSection.propTypes = {
    children: PropTypes.node
};

export {
    MenuComponent as default,
    MenuItem,
    MenuSection,
    Submenu
};
