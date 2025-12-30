import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, {useMemo} from 'react';
import {FormattedMessage} from 'react-intl';
import {connect} from 'react-redux';

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
import {BaseMenu} from './base-menu.jsx';

import themeIcon from '../../lib/assets/icon--theme.svg';
import {colorModeMenuOpen, openColorModeMenu, openThemeMenu} from '../../reducers/menus.js';

const enabledColorModes = [DEFAULT_MODE, HIGH_CONTRAST_MODE];


class SettingsMenu extends BaseMenu {
    constructor (props) {
        super(props);

        this.languageRef = React.createRef();
        this.preferenceRef = React.createRef();
        // hardcoded logic because of only two options
        this.itemRefs = [this.languageRef, this.preferenceRef];
    }

    render () {
        const {
            canChangeLanguage,
            canChangeColorMode,
            canChangeTheme,
            hasActiveMembership,
            isRtl,
            isColorModeMenuOpen,
            isThemeMenuOpen,
            activeColorMode,
            onChangeColorMode,
            onRequestOpenColorMode,
            onRequestOpenTheme,
            activeTheme,
            onChangeTheme
        } = this.props;


        const enabledColorModesMap = Object.keys(colorModeMap).reduce((acc, colorMode) => {
            if (enabledColorModes.includes(colorMode)) {
                acc[colorMode] = colorModeMap[colorMode];
            }
            return acc;
        }, {});
        const availableThemesMap = Object.keys(themeMap).reduce((acc, themeKey) => {
            const theme = themeMap[themeKey];
            if (theme.isAvailable?.({hasActiveMembership})) {
                acc[themeKey] = theme;
            }
            return acc;
        }, {});
        const availableThemesLength = Object.keys(availableThemesMap).length;

        return (<div
            className={classNames(menuBarStyles.menuBarItem, menuBarStyles.hoverable, menuBarStyles.themeMenu, {
                [menuBarStyles.active]: this.isExpanded()
            })}
            role="button"
            aria-expanded={this.isExpanded()}
            tabIndex={0}
            aria-label="Settings"
            onClick={this.handleOnOpen}
            onKeyDown={this.handleKeyPress}
            ref={this.menuRef}
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
                open={this.isExpanded()}
                place={isRtl ? 'left' : 'right'}
                onRequestClose={this.handleOnClose}
            >
                <MenuSection>
                    {canChangeLanguage && <LanguageMenu
                        menuRef={this.languageRef}
                        depth={2}
                    />}
                    {canChangeTheme &&
                        // TODO: Consider always showing the theme menu, even if there is a single available theme
                        availableThemesLength > 1 &&
                        <PreferenceMenu
                            menuRef={this.preferenceRef}
                            depth={2}
                            open={isThemeMenuOpen}
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
                            onRequestCloseSettings={this.handleOnClose}
                            onRequestOpen={onRequestOpenTheme}
                        />}
                    {canChangeColorMode && <PreferenceMenu
                        open={isColorModeMenuOpen}
                        itemsMap={enabledColorModesMap}
                        onChange={onChangeColorMode}
                        submenuLabel={{
                            defaultMessage: 'Color Mode',
                            description: 'Color mode sub-menu',
                            id: 'gui.menuBar.colorMode'
                        }}
                        selectedItemKey={activeColorMode}
                        isRtl={isRtl}
                        onRequestCloseSettings={this.handleOnClose}
                        onRequestOpen={onRequestOpenColorMode}
                    />}
                </MenuSection>
            </MenuBarMenu>
        </div>);
    }
};

SettingsMenu.propTypes = {
    canChangeLanguage: PropTypes.bool,
    canChangeColorMode: PropTypes.bool,
    canChangeTheme: PropTypes.bool,
    isRtl: PropTypes.bool,
    activeColorMode: PropTypes.string,
    onChangeColorMode: PropTypes.func,
    onRequestOpenColorMode: PropTypes.func,
    isColorModeMenuOpen: PropTypes.bool,
    activeTheme: PropTypes.string,
    onChangeTheme: PropTypes.func,
    onRequestOpenTheme: PropTypes.func
};

const mapStateToProps = state => ({
    activeColorMode: state.scratchGui.settings.colorMode,
    activeTheme: state.scratchGui.settings.theme,
    isColorModeMenuOpen: colorModeMenuOpen(state)
});

const mapDispatchToProps = (dispatch, ownProps) => ({
    onRequestOpenColorMode: () => {
        dispatch(openColorModeMenu());
    },
    onRequestOpenTheme: () => {
        dispatch(openThemeMenu());
    },
    onChangeColorMode: colorMode => {
        dispatch(setColorMode(colorMode));
        ownProps.onRequestClose();
        persistColorMode(colorMode);
    },
    onChangeTheme: theme => {
        dispatch(setTheme(theme));
        ownProps.onRequestClose();
        persistTheme(theme);
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(SettingsMenu);
