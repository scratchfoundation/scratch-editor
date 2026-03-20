import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {FormattedMessage} from 'react-intl';
import {connect} from 'react-redux';
import useMenuNavigation from '../../hooks/use-menu-navigation';

import check from './check.svg';
import {MenuItem, Submenu} from '../menu/menu.jsx';

import styles from './settings-menu.css';

import dropdownCaret from './dropdown-caret.svg';

const intlMessageShape = PropTypes.shape({
    defaultMessage: PropTypes.string,
    description: PropTypes.string,
    id: PropTypes.string
});

const PreferenceItem = props => {
    const item = props.item;

    return (
        <MenuItem
            onClick={props.onClick}
            onParentKeyDown={props.onParentKeyDown}
            isSelected={props.isSelected}
            isDataMenuItem={props.isDataMenuItem}
        >
            <div className={styles.option}>
                <img
                    className={classNames(styles.check, {[styles.selected]: props.isSelected})}
                    src={check}
                />
                {item.icon && <img
                    className={styles.icon}
                    src={item.icon}
                />}
                <FormattedMessage {...item.label} />
            </div>
        </MenuItem>);
};

PreferenceItem.propTypes = {
    isSelected: PropTypes.bool,
    onClick: PropTypes.func,
    item: PropTypes.shape({
        icon: PropTypes.string,
        label: intlMessageShape.isRequired
    }),
    onParentKeyDown: PropTypes.func,
    isDataMenuItem: PropTypes.bool
};

const PreferenceMenu = ({
    itemsMap,
    onChange,
    defaultMenuIconSrc,
    submenuLabel,
    selectedItemKey,
    isRtl,
    depth
}) => {
    const itemKeys = Object.keys(itemsMap);
    const selectedItem = itemsMap[selectedItemKey];

    const {
        isExpanded,
        handleKeyDown,
        handleKeyDownOpenMenu,
        handleOnOpen,
        menuRef
    } = useMenuNavigation({
        depth: depth ?? 1,
        isRtl
    });

    return (
        <MenuItem
            isExpanded={isExpanded()}
            isDataMenuItemWrapper
            ref={menuRef}
            onKeyDown={handleKeyDown}
        >
            <button
                className={styles.option}
                onClick={handleOnOpen}
                data-menu-item
            >
                <img
                    src={selectedItem.icon || defaultMenuIconSrc}
                    style={{width: 24}}
                />
                <span className={styles.submenuLabel}>
                    <FormattedMessage {...submenuLabel} />
                </span>
                <img
                    className={styles.expandCaret}
                    src={dropdownCaret}
                />
            </button>
            <Submenu place={isRtl ? 'left' : 'right'}>
                {itemKeys.map(itemKey => (
                    <PreferenceItem
                        onParentKeyDown={handleKeyDownOpenMenu}
                        isDataMenuItem
                        key={itemKey}
                        isSelected={itemKey === selectedItemKey}
                        // eslint-disable-next-line react/jsx-no-bind
                        onClick={() => onChange(itemKey)}
                        item={itemsMap[itemKey]}
                    />)
                )}
            </Submenu>
        </MenuItem>
    );
};

PreferenceMenu.propTypes = {
    itemsMap: PropTypes.objectOf(PropTypes.shape({
        icon: PropTypes.string,
        label: intlMessageShape.isRequired
    })).isRequired,
    onChange: PropTypes.func,
    defaultMenuIconSrc: PropTypes.string,
    submenuLabel: intlMessageShape.isRequired,
    selectedItemKey: PropTypes.string,
    isRtl: PropTypes.bool,
    depth: PropTypes.number
};

const mapStateToProps = state => ({
    isRtl: state.locales.isRtl
});

export default connect(
    mapStateToProps
)(PreferenceMenu);
