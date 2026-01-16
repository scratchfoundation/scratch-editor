import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, {useMemo} from 'react';
import {FormattedMessage} from 'react-intl';
import {connect} from 'react-redux';
import useMenuNavigation from '../../hooks/use-menu-navigation.jsx';

import check from './check.svg';
import {MenuItem, Submenu} from '../menu/menu.jsx';

import styles from './settings-menu.css';

import dropdownCaret from './dropdown-caret.svg';
import propTypes from '../../lib/prop-types.js';

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
            onParentKeyPress={props.onParentKeyPress}
            itemRef={props.itemRef}
            isSelected={props.isSelected}
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
    onParentKeyPress: PropTypes.func,
    itemRef: PropTypes.shape({current: PropTypes.instanceOf(Element)})
};

const PreferenceMenu = ({
    itemsMap,
    onChange,
    defaultMenuIconSrc,
    submenuLabel,
    selectedItemKey,
    isRtl,
    menuRef
}) => {
    const itemRefs = useMemo(() => Object.keys(itemsMap).map(() => React.createRef()), [itemsMap]);

    const itemKeys = Object.keys(itemsMap);
    const selectedItem = itemsMap[selectedItemKey];

    const {
        isExpanded,
        handleKeyPress,
        handleKeyPressOpenMenu,
        handleOnOpen
    } = useMenuNavigation({
        menuRef,
        itemRefs,
        depth: 2
    });

    return (
        <MenuItem expanded={isExpanded()}>
            <button
                className={styles.option}
                onClick={handleOnOpen}
                ref={menuRef}
                aria-expanded={isExpanded()}
                tabIndex={-1}
                onKeyDown={handleKeyPress}
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
                {itemKeys.map((itemKey, index) => (
                    <PreferenceItem
                        onParentKeyPress={handleKeyPressOpenMenu}
                        key={itemKey}
                        isSelected={itemKey === selectedItemKey}
                        // eslint-disable-next-line react/jsx-no-bind
                        onClick={() => onChange(itemKey)}
                        item={itemsMap[itemKey]}
                        itemRef={itemRefs[index]}
                    />)
                )}
            </Submenu>
        </MenuItem>
    );
};

PreferenceMenu.propTypes = {
    menuRef: propTypes.ref.isRequired,
    itemsMap: PropTypes.objectOf(PropTypes.shape({
        icon: PropTypes.string,
        label: intlMessageShape.isRequired
    })).isRequired,
    onChange: PropTypes.func,
    defaultMenuIconSrc: PropTypes.string,
    submenuLabel: intlMessageShape.isRequired,
    selectedItemKey: PropTypes.string,
    isRtl: PropTypes.bool
};

const mapStateToProps = state => ({
    isRtl: state.locales.isRtl
});

export default connect(
    mapStateToProps
)(PreferenceMenu);
