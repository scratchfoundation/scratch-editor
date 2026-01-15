import React, {useRef} from 'react';
import styles from './menu-bar.css';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';

import {useIntl, FormattedMessage, defineMessage} from 'react-intl';
import MenuBarMenu from './menu-bar-menu.jsx';
import {MenuItem, MenuSection} from '../menu/menu.jsx';
import useMenuNavigation from '../../hooks/use-menu-navigation.jsx';

import propTypes from '../../lib/prop-types.js';

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
    menuRef
}) => {
    const intl = useIntl();

    const normalRef = useRef(null);
    const caturdayRef = useRef(null);
    
    const itemRefs = [
        normalRef,
        caturdayRef
    ];

    const {
        isExpanded,
        handleOnOpen,
        handleOnClose,
        handleKeyPress,
        handleKeyPressOpenMenu
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
            ref={menuRef}
            aria-label={intl.formatMessage(modeMenu)}
            aria-expanded={isExpanded()}
            onKeyDown={handleKeyPress}
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
                        itemRef={normalRef}
                        onParentKeyPress={handleKeyPressOpenMenu}
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
                        itemRef={caturdayRef}
                        onParentKeyPress={handleKeyPressOpenMenu}
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
    menuRef: propTypes.ref.isRequired,
    onSetMode: PropTypes.func.isRequired,
    modeNow: PropTypes.bool.isRequired,
    mode2020: PropTypes.bool.isRequired,
    isRtl: PropTypes.bool
};

const mapStateToProps = state => ({
    isRtl: state.locales.isRtl
});

export default connect(
    mapStateToProps
)(ModeMenu);
