import React, {useRef} from 'react';
import styles from './menu-bar.css';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';

import editIcon from './icon--edit.svg';
import {useIntl, FormattedMessage, defineMessage} from 'react-intl';
import MenuBarMenu from './menu-bar-menu.jsx';
import {MenuItem, MenuSection} from '../menu/menu.jsx';
import useMenuNavigation from '../../hooks/use-menu-navigation.jsx';
import dropdownCaret from './dropdown-caret.svg';
import DeletionRestorer from '../../containers/deletion-restorer.jsx';
import TurboMode from '../../containers/turbo-mode.jsx';
import propTypes from '../../lib/prop-types.js';

const editMenu = defineMessage({
    id: 'gui.aria.editMenu',
    defaultMessage: 'Edit menu',
    description: 'accessibility label for edit menu'
});

const EditMenu = ({
    menuRef,
    isRtl,
    onRestoreOption,
    restoreOptionMessage
}) => {
    const intl = useIntl();

    const restoreRef = useRef(null);
    const turboRef = useRef(null);

    const itemRefs = [restoreRef, turboRef];

    const {
        isExpanded,
        handleKeyPress,
        handleKeyPressOpenMenu,
        handleOnOpen,
        handleOnClose
    } = useMenuNavigation({
        menuRef,
        itemRefs,
        depth: 1
    });

    return (
        <button
            className={classNames(styles.menuBarItem, styles.hoverable, {
                [styles.active]: isExpanded()
            })}
            onClick={handleOnOpen}
            aria-label={intl.formatMessage(editMenu)}
            aria-expanded={isExpanded()}
            onKeyDown={handleKeyPress}
            ref={menuRef}
        >
            <img src={editIcon} />
            <span className={styles.collapsibleLabel}>
                <FormattedMessage
                    defaultMessage="Edit"
                    description="Text for edit dropdown menu"
                    id="gui.menuBar.edit"
                />
            </span>
            <img src={dropdownCaret} />
            <MenuBarMenu
                className={classNames(styles.menuBarMenu)}
                open={isExpanded()}
                place={isRtl ? 'left' : 'right'}
                onRequestClose={handleOnClose}
            >
                <DeletionRestorer>{(handleRestore, {restorable, deletedItem}) => (
                    <MenuItem
                        className={classNames({[styles.disabled]: !restorable})}
                        onClick={onRestoreOption(handleRestore)}
                        itemRef={restoreRef}
                        onParentKeyPress={handleKeyPressOpenMenu}
                        isDisabled={!restorable}
                    >
                        {restoreOptionMessage(deletedItem)}
                    </MenuItem>
                )}</DeletionRestorer>
                <MenuSection>
                    <TurboMode>{(toggleTurboMode, {turboMode}) => (
                        <MenuItem
                            onClick={toggleTurboMode}
                            itemRef={turboRef}
                            onParentKeyPress={handleKeyPressOpenMenu}
                        >
                            {turboMode ? (
                                <FormattedMessage
                                    defaultMessage="Turn off Turbo Mode"
                                    description="Menu bar item for turning off turbo mode"
                                    id="gui.menuBar.turboModeOff"
                                />
                            ) : (
                                <FormattedMessage
                                    defaultMessage="Turn on Turbo Mode"
                                    description="Menu bar item for turning on turbo mode"
                                    id="gui.menuBar.turboModeOn"
                                />
                            )}
                        </MenuItem>
                    )}</TurboMode>
                </MenuSection>
            </MenuBarMenu>
        </button>
    );
};

EditMenu.propTypes = {
    menuRef: propTypes.ref.isRequired,
    isRtl: PropTypes.bool,
    restoreOptionMessage: PropTypes.func.isRequired,
    onRestoreOption: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
    isRtl: state.locales.isRtl
});

export default connect(
    mapStateToProps
)(EditMenu);
