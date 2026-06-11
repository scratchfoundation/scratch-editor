import React from 'react';
import styles from './menu-bar.css';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';

import {useIntl, FormattedMessage, defineMessage} from 'react-intl';
import MenuBarMenu from './menu-bar-menu.jsx';
import {MenuItem, MenuSection} from '../menu/menu.jsx';
import useMenuNavigation from '../../hooks/use-menu-navigation';

const EditorModes = {
    NOW: 'NOW',
    MODE_2020: '2020'
};

const modeMenu = defineMessage({
    id: 'gui.aria.modeMenu',
    defaultMessage: 'Mode menu',
    description: 'accessibility label for mode menu'
});

const ModeMenu = ({
    isRtl,
    mode2020,
    modeNow,
    onSetMode,
    depth
}) => {
    const intl = useIntl();

    const {
        isExpanded,
        handleOnOpen,
        handleOnClose,
        handleKeyDown,
        handleKeyDownOpenMenu,
        menuRef
    } = useMenuNavigation({
        depth,
        isRtl
    });

    return (
        <button
            className={classNames(styles.menuBarItem, styles.hoverable, {
                [styles.active]: isExpanded()
            })}
            onClick={handleOnOpen}
            ref={menuRef}
            aria-label={intl.formatMessage(modeMenu)}
            aria-expanded={isExpanded()}
            onKeyDown={handleKeyDown}
        >
            <div className={classNames(styles.editMenu)}>
                <FormattedMessage
                    defaultMessage="Mode"
                    description="Mode menu item in the menu bar"
                    id="gui.menuBar.modeMenu"
                />
            </div>
            <MenuBarMenu
                className={classNames(styles.menuBarMenu)}
                open={isExpanded()}
                place={isRtl ? 'left' : 'right'}
                onRequestClose={handleOnClose}
            >
                <MenuSection>
                    <MenuItem
                        onClick={onSetMode(EditorModes.NOW)}
                        isDataMenuItem
                        onParentKeyDown={handleKeyDownOpenMenu}
                    >
                        <span className={classNames({[styles.inactive]: !modeNow})}>
                            {'✓'}
                        </span>
                        {' '}
                        <FormattedMessage
                            defaultMessage="Normal mode"
                            description="April fools: resets editor to not have any pranks"
                            id="gui.menuBar.normalMode"
                        />
                    </MenuItem>
                    <MenuItem
                        onClick={onSetMode(EditorModes.MODE_2020)}
                        isDataMenuItem
                        onParentKeyDown={handleKeyDownOpenMenu}
                    >
                        <span className={classNames({[styles.inactive]: !mode2020})}>
                            {'✓'}
                        </span>
                        {' '}
                        <FormattedMessage
                            defaultMessage="Caturday mode"
                            description="April fools: Cat blocks mode"
                            id="gui.menuBar.caturdayMode"
                        />
                    </MenuItem>
                </MenuSection>
            </MenuBarMenu>
        </button>
    );
};

ModeMenu.propTypes = {
    onSetMode: PropTypes.func.isRequired,
    modeNow: PropTypes.bool.isRequired,
    mode2020: PropTypes.bool.isRequired,
    isRtl: PropTypes.bool,
    depth: PropTypes.number
};

const mapStateToProps = state => ({
    isRtl: state.locales.isRtl
});

export default connect(
    mapStateToProps
)(ModeMenu);
