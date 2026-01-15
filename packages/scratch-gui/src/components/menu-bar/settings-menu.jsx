import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, {useRef, useMemo} from 'react';
import {useIntl, FormattedMessage, defineMessages} from 'react-intl';
import {connect} from 'react-redux';
import useMenuNavigation from '../../hooks/use-menu-navigation.jsx';

import LanguageMenu from './language-menu.jsx';
import MenuBarMenu from './menu-bar-menu.jsx';
import {MenuSection} from '../menu/menu.jsx';
import PreferenceMenu from './preference-menu.jsx';

import {DEFAULT_MODE, HIGH_CONTRAST_MODE, colorModeMap} from '../../lib/settings/color-mode/index.js';
import {themeMap} from '../../lib/settings/theme/index.js';
import {persistColorMode} from '../../lib/settings/color-mode/persistence.js';
import {persistTheme} from '../../lib/settings/theme/persistence.js';
import {setColorMode, setTheme} from '../../reducers/settings.js';

import menuBarStyles from './menu-bar.css';
import styles from './settings-menu.css';

import dropdownCaret from './dropdown-caret.svg';
import settingsIcon from './icon--settings.svg';

import themeIcon from '../../lib/assets/icon--theme.svg';
import propTypes from '../../lib/prop-types.js';

const ariaMessages = defineMessages({
    settingsMenu: {
        id: 'gui.aria.settingsMenu',
        defaultMessage: 'Settings menu',
        description: 'accessibility label for settings menu'
    },
    themeMenu: {
        id: 'gui.aria.themeMenu',
        defaultMessage: 'Theme menu',
        description: 'accessibility label for theme menu'
    },
    colorMenu: {
        id: 'gui.aria.colorMenu',
        defaultMessage: 'Color menu',
        description: 'accessibility label for color menu'
    }
});

const enabledColorModes = [DEFAULT_MODE, HIGH_CONTRAST_MODE];

const SettingsMenu = ({
    menuRef,
    canChangeLanguage,
    canChangeColorMode,
    canChangeTheme,
    hasActiveMembership,
    isRtl,
    activeColorMode,
    onChangeColorMode,
    activeTheme,
    onChangeTheme
}) => {
    const intl = useIntl();

    const enabledColorModesMap = useMemo(() => Object.keys(colorModeMap).reduce((acc, colorMode) => {
        if (enabledColorModes.includes(colorMode)) {
            acc[colorMode] = colorModeMap[colorMode];
        }
        return acc;
    }, {}), []);
    const availableThemesMap = useMemo(() => Object.keys(themeMap).reduce((acc, themeKey) => {
        const theme = themeMap[themeKey];
        if (theme.isAvailable?.({hasActiveMembership})) {
            acc[themeKey] = theme;
        }
        return acc;
    }, {}), [hasActiveMembership]);
    const availableThemesLength = useMemo(() => Object.keys(availableThemesMap).length, [availableThemesMap]);

    const languageRef = useRef(null);
    const themeRef = useRef(null);
    const colorRef = useRef(null);
    const itemRefs = [
        ...(canChangeLanguage ? [languageRef] : []),
        // TODO: If we do change the condition below for displaying the element, we have
        // to change it here also. Perhaps a variable for those conditions might be of use
        ...(canChangeTheme && availableThemesLength > 1 ? [themeRef] : []),
        ...(canChangeColorMode ? [colorRef] : [])
    ];

    const {
        isExpanded,
        handleOnOpen,
        handleOnClose,
        handleKeyPress
    } = useMenuNavigation({
        menuRef,
        itemRefs,
        depth: 1
    });

    return (<button
        className={classNames(menuBarStyles.menuBarItem, menuBarStyles.hoverable, menuBarStyles.themeMenu, {
            [menuBarStyles.active]: isExpanded()
        })}
        aria-expanded={isExpanded()}
        aria-label={intl.formatMessage(ariaMessages.settingsMenu)}
        onClick={handleOnOpen}
        onKeyDown={handleKeyPress}
        ref={menuRef}
    >
        <img src={settingsIcon} />
        <span className={styles.dropdownLabel}>
            <FormattedMessage
                defaultMessage="Settings"
                description="Settings menu"
                id="gui.menuBar.settings"
            />
        </span>
        <img src={dropdownCaret} />
        <MenuBarMenu
            className={menuBarStyles.menuBarMenu}
            open={isExpanded()}
            place={isRtl ? 'left' : 'right'}
            onRequestClose={handleOnClose}
        >
            <MenuSection>
                {canChangeLanguage && <LanguageMenu
                    menuRef={languageRef}
                    depth={2}
                />}
                {canChangeTheme &&
                    // TODO: Consider always showing the theme menu, even if there is a single available theme
                    availableThemesLength > 1 &&
                    <PreferenceMenu
                        ariaLabel={intl.formatMessage(ariaMessages.themeMenu)}
                        menuRef={themeRef}
                        depth={2}
                        itemsMap={availableThemesMap}
                        onChange={onChangeTheme}
                        defaultMenuIconSrc={themeIcon}
                        submenuLabel={{
                            defaultMessage: 'Theme',
                            description: 'Theme sub-menu',
                            id: 'gui.menuBar.theme'
                        }}
                        selectedItemKey={activeTheme}
                        isRtl={isRtl}
                    />}
                {canChangeColorMode && <PreferenceMenu
                    ariaLabel={intl.formatMessage(ariaMessages.colorMenu)}
                    menuRef={colorRef}
                    depth={2}
                    itemsMap={enabledColorModesMap}
                    onChange={onChangeColorMode}
                    submenuLabel={{
                        defaultMessage: 'Color Mode',
                        description: 'Color mode sub-menu',
                        id: 'gui.menuBar.colorMode'
                    }}
                    selectedItemKey={activeColorMode}
                    isRtl={isRtl}
                />}
            </MenuSection>
        </MenuBarMenu>
    </button>);
};

SettingsMenu.propTypes = {
    menuRef: propTypes.ref.isRequired,
    canChangeLanguage: PropTypes.bool.isRequired,
    canChangeColorMode: PropTypes.bool.isRequired,
    canChangeTheme: PropTypes.bool.isRequired,
    hasActiveMembership: PropTypes.bool.isRequired,
    isRtl: PropTypes.bool.isRequired,
    activeColorMode: PropTypes.string,
    onChangeColorMode: PropTypes.func,
    activeTheme: PropTypes.string,
    onChangeTheme: PropTypes.func
};

const mapStateToProps = state => ({
    activeColorMode: state.scratchGui.settings.colorMode,
    activeTheme: state.scratchGui.settings.theme
});

const mapDispatchToProps = dispatch => ({
    onChangeColorMode: colorMode => {
        dispatch(setColorMode(colorMode));
        persistColorMode(colorMode);
    },
    onChangeTheme: theme => {
        dispatch(setTheme(theme));
        persistTheme(theme);
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(SettingsMenu);
