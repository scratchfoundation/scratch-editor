import classNames from 'classnames';
import PropTypes from 'prop-types';
import bindAll from 'lodash.bindall';
import React from 'react';
import {FormattedMessage} from 'react-intl';

import LanguageMenu from './language-menu.jsx';
import MenuBarMenu from './menu-bar-menu.jsx';
import ThemeMenu from './theme-menu.jsx';
import {MenuSection} from '../menu/menu.jsx';
import {MenuRefContext} from '../context-menu/menu-path-context.jsx';

import menuBarStyles from './menu-bar.css';
import styles from './settings-menu.css';

import dropdownCaret from './dropdown-caret.svg';
import settingsIcon from './icon--settings.svg';

class SettingsMenu extends React.Component {
    constructor (props) {
        super(props);

        bindAll(this, [
            'handleOnClose',
            'handleKeyPress',
            'handleKeyPressOpenMenu',
            'handleMove',
            'handleOnOpen',
            'setFocusedRef'
        ]);
        
        this.settingsRef = React.createRef();
        this.state = {focusedIndex: -1};
        this.languageRef = React.createRef();
        this.themeRef = React.createRef();
        // harcoded logic because of only two options
        this.itemRefs = [this.languageRef, this.themeRef];
    }

    componentDidUpdate (prevProps) {
        if (!prevProps.settingsMenuOpen && this.props.settingsMenuOpen) {
            this.setState({focusedIndex: 0}, () => {
                this.setFocusedRef(this.itemRefs[0]);
            });
        }
    }

    static contextType = MenuRefContext;

    handleOnClose () {
        this.context.removeByRef(this.settingsRef);
        this.props.onRequestClose();
        this.setState({focusedIndex: -1});
    }

    handleOnOpen () {
        if (this.context.isOpenMenu(this.settingsRef)) return;

        this.setState({focusedIndex: 0}, () => {
            this.props.onRequestOpen();
            this.context.addInner(this.settingsRef);
            this.setFocusedRef(this.itemRefs[0]);
        });
    }

    setFocusedRef (component) {
        this.focusedRef = component;
        if (this.focusedRef && this.focusedRef.current) {
            this.focusedRef.current.focus();
        }
    }

    handleKeyPress (e) {
        if (e.key === 'Tab') {
            this.handleOnClose();
        }

        if (this.context.isTopMenu(this.settingsRef)) {
            this.handleKeyPressOpenMenu(e);
        } else if (!this.context.isOpenMenu(this.settingsRef) && (e.key === ' ' || e.key === 'ArrowRight')) {
            e.preventDefault();
            this.handleOnOpen();
        }
    }

    handleKeyPressOpenMenu (e) {
        if (e.key === 'ArrowLeft' || e.key === 'Escape') {
            e.preventDefault();
            this.handleOnClose();
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.handleMove(-1);
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.handleMove(1);
        }
    }

    handleMove (direction) {
        const nextIndex =
            (this.state.focusedIndex + direction + this.itemRefs.length) % this.itemRefs.length;
        this.setState({focusedIndex: nextIndex}, () => {
            this.setFocusedRef(this.itemRefs[nextIndex]);
        });
    }

    render () {
        const {
            canChangeLanguage,
            canChangeTheme,
            isRtl,
            onRequestClose,
            settingsMenuOpen
        } = this.props;

        return (<div
            className={classNames(menuBarStyles.menuBarItem, menuBarStyles.hoverable, menuBarStyles.themeMenu, {
                [menuBarStyles.active]: settingsMenuOpen
            })}
            ref={this.settingsRef}
            role="button"
            aria-expanded={this.context.isTopMenu(this.settingsRef)}
            tabIndex={0}
            aria-label="Settings"
            onClick={this.handleOnOpen}
            onKeyDown={this.handleKeyPress}
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
                open={this.context.isOpenMenu(this.settingsRef)}
                place={isRtl ? 'left' : 'right'}
                onRequestClose={this.handleOnClose}
            >
                <MenuSection>
                    {canChangeLanguage && <LanguageMenu
                        focusedRef={this.languageRef}
                        onRequestCloseSettings={onRequestClose}
                    />}
                    {canChangeTheme && <ThemeMenu
                        focusedRef={this.themeRef}
                        onRequestCloseSettings={onRequestClose}
                    />}
                </MenuSection>
            </MenuBarMenu>
        </div>);
    }
};

SettingsMenu.propTypes = {
    canChangeLanguage: PropTypes.bool,
    canChangeTheme: PropTypes.bool,
    isRtl: PropTypes.bool,
    onRequestClose: PropTypes.func,
    onRequestOpen: PropTypes.func,
    settingsMenuOpen: PropTypes.bool
};

export default SettingsMenu;
