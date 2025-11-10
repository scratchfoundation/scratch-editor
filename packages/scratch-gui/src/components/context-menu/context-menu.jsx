import React from 'react';
import PropTypes from 'prop-types';
import ContextMenu from '../../lib/radix-ui-context-menu.js';
import classNames from 'classnames';
import styles from './context-menu.css';

const StyledMenuItem = ({children, ...props}) => (
    <ContextMenu.ContextMenuItem
        className={styles.menuItem}
        {...props}
    >
        {children}
    </ContextMenu.ContextMenuItem>
);

StyledMenuItem.propTypes = {
    children: PropTypes.node
};

const BorderedMenuItem = ({children, ...props}) => (
    <ContextMenu.ContextMenuItem
        className={classNames(styles.menuItem, styles.menuItemBordered)}
        {...props}
    >
        {children}
    </ContextMenu.ContextMenuItem>
);

BorderedMenuItem.propTypes = {
    children: PropTypes.node
};

const DangerousMenuItem = ({children, ...props}) => (
    <ContextMenu.ContextMenuItem
        className={classNames(styles.menuItem, styles.menuItemBordered, styles.menuItemDanger)}
        {...props}
    >
        {children}
    </ContextMenu.ContextMenuItem>
);

DangerousMenuItem.propTypes = {
    children: PropTypes.node
};

export {
    BorderedMenuItem,
    DangerousMenuItem,
    StyledMenuItem as MenuItem
};
