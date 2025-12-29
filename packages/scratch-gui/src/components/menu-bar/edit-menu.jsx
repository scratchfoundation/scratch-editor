import React from 'react';
import styles from './menu-bar.css';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import bindAll from 'lodash.bindall';

import editIcon from './icon--edit.svg';
import {FormattedMessage} from 'react-intl';
import MenuBarMenu from './menu-bar-menu.jsx';
import {MenuItem, MenuSection} from '../menu/menu.jsx';
import {BaseMenu} from './base-menu';
import dropdownCaret from './dropdown-caret.svg';
import DeletionRestorer from '../../containers/deletion-restorer.jsx';
import TurboMode from '../../containers/turbo-mode.jsx';

export class EditMenu extends BaseMenu {
    constructor (props) {
        super(props);

        bindAll(this);

        this.restoreRef = React.createRef();
        this.turboRef = React.createRef();
        
        this.itemRefs = [
            this.restoreRef,
            this.turboRef
        ];
    }

    render () {
        return (
            <div
                className={classNames(styles.menuBarItem, styles.hoverable, {
                    [styles.active]: this.isExpanded()
                })}
                onClick={this.handleOnOpen}
                role="button"
                aria-label="Edit Menu"
                aria-expanded={this.isExpanded()}
                tabIndex={0}
                onKeyDown={this.handleKeyPress}
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
                    open={this.isExpanded()}
                    place={this.props.isRtl ? 'left' : 'right'}
                    onRequestClose={this.handleOnClose}
                >
                    <DeletionRestorer>{(handleRestore, {restorable, deletedItem}) => (
                        <MenuItem
                            className={classNames({[styles.disabled]: !restorable})}
                            onClick={this.props.onRestoreOption(handleRestore)}
                            menuRef={this.restoreRef}
                            onParentKeyPress={this.handleKeyPressOpenMenu}
                        >
                            {this.props.restoreOptionMessage(deletedItem)}
                        </MenuItem>
                    )}</DeletionRestorer>
                    <MenuSection>
                        <TurboMode>{(toggleTurboMode, {turboMode}) => (
                            <MenuItem
                                onClick={toggleTurboMode}
                                menuRef={this.turboRef}
                                onParentKeyPress={this.handleKeyPressOpenMenu}
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
            </div>
        );
    }
}

EditMenu.propTypes = {
    menuRef: PropTypes.shape({current: PropTypes.instanceOf(Element)}),
    isRtl: PropTypes.bool,
    restoreOptionMessage: PropTypes.func,
    onRestoreOption: PropTypes.func
};

export default EditMenu;
