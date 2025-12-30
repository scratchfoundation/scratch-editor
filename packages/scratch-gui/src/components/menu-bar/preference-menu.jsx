import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, {useMemo} from 'react';
import {FormattedMessage} from 'react-intl';
import {connect} from 'react-redux';

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
        <MenuItem onClick={props.onClick}>
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
    })
};

const PreferenceMenu = ({
    itemsMap,
    open,
    onChange,
    onRequestOpen,
    defaultMenuIconSrc,
    submenuLabel,
    selectedItemKey,
    isRtl
}) => {
    const itemKeys = useMemo(() => Object.keys(itemsMap), [itemsMap]);
    const selectedItem = useMemo(() => itemsMap[selectedItemKey], [itemsMap, selectedItemKey]);
    return (
        <MenuItem expanded={open}>
            <div
                className={styles.option}
                onClick={onRequestOpen}
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
            </div>
            <Submenu place={isRtl ? 'left' : 'right'}>
                {itemKeys.map(itemKey => (
                    <PreferenceItem
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
    open: PropTypes.bool,
    onChange: PropTypes.func,
    onRequestCloseSettings: PropTypes.func,
    onRequestOpen: PropTypes.func,
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
