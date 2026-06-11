import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, {useMemo} from 'react';
import {useIntl, FormattedMessage, defineMessage} from 'react-intl';
import {connect} from 'react-redux';
import useMenuNavigation from '../../hooks/use-menu-navigation';

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

const settingsMenuAriaMessage = defineMessage({
    id: 'gui.aria.settingsMenu',
    defaultMessage: 'Settings menu',
    description: 'accessibility label for settings menu'
});

const enabledColorModes = [DEFAULT_MODE, HIGH_CONTRAST_MODE];

const SettingsMenu = ({
    canChangeLanguage,
    canChangeColorMode,
    canChangeTheme,
    hasActiveMembership,
    isRtl,
    activeColorMode,
    onChangeColorMode,
    activeTheme,
    onChangeTheme,
    depth
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

    const {
        isExpanded,
        handleOnOpen,
        handleOnClose,
        handleKeyDown,
        menuRef
    } = useMenuNavigation({
        depth,
        isRtl
    });

    return (<button
        className={classNames(menuBarStyles.menuBarItem, menuBarStyles.hoverable, menuBarStyles.themeMenu, {
            [menuBarStyles.active]: isExpanded()
        })}
        aria-expanded={isExpanded()}
        aria-label={intl.formatMessage(settingsMenuAriaMessage)}
        onClick={handleOnOpen}
        onKeyDown={handleKeyDown}
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
                {canChangeLanguage && <LanguageMenu depth={depth + 1} />}
                {canChangeTheme &&
                    // TODO: Consider always showing the theme menu, even if there is a single available theme
                    availableThemesLength > 1 &&
                    <PreferenceMenu
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
                        depth={depth + 1}
                    />}
                {canChangeColorMode && <PreferenceMenu
                    itemsMap={enabledColorModesMap}
                    onChange={onChangeColorMode}
                    submenuLabel={{
                        defaultMessage: 'Color Mode',
                        description: 'Color mode sub-menu',
                        id: 'gui.menuBar.colorMode'
                    }}
                    selectedItemKey={activeColorMode}
                    isRtl={isRtl}
                    depth={depth + 1}
                />}
            </MenuSection>
        </MenuBarMenu>
    </button>);
};

SettingsMenu.propTypes = {
    canChangeLanguage: PropTypes.bool,
    canChangeColorMode: PropTypes.bool,
    canChangeTheme: PropTypes.bool,
    hasActiveMembership: PropTypes.bool,
    isRtl: PropTypes.bool,
    activeColorMode: PropTypes.string,
    onChangeColorMode: PropTypes.func,
    activeTheme: PropTypes.string,
    onChangeTheme: PropTypes.func,
    depth: PropTypes.number
};

const mapStateToProps = state => ({
    activeColorMode: state.scratchGui.settings.colorMode,
    activeTheme: state.scratchGui.settings.theme,
    isRtl: state.locales.isRtl
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
