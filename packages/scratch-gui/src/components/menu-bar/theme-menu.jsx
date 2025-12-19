import classNames from 'classnames';
import PropTypes from 'prop-types';
import bindAll from 'lodash.bindall';
import React from 'react';
import {FormattedMessage} from 'react-intl';
import {connect} from 'react-redux';

import check from './check.svg';
import {MenuItem, Submenu} from '../menu/menu.jsx';
import {DEFAULT_THEME, HIGH_CONTRAST_THEME, themeMap} from '../../lib/themes';
import {persistTheme} from '../../lib/themes/themePersistance';
import {openThemeMenu, closeThemeMenu} from '../../reducers/menus.js';
import {setTheme} from '../../reducers/theme.js';
import {MenuRefContext} from '../context-menu/menu-path-context.jsx';

import styles from './settings-menu.css';

import dropdownCaret from './dropdown-caret.svg';

const ThemeMenuItem = props => {
    const themeInfo = themeMap[props.theme];

    return (
        <MenuItem
            onClick={props.onClick}
            focusedRef={props.focusedRef}
            onParentKeyPress={props.onParentKeyPress}
        >
            <div className={styles.option}>
                <img
                    className={classNames(styles.check, {[styles.selected]: props.isSelected})}
                    src={check}
                />
                <img
                    className={styles.icon}
                    src={themeInfo.icon}
                />
                <FormattedMessage {...themeInfo.label} />
            </div>
        </MenuItem>);
};

ThemeMenuItem.propTypes = {
    isSelected: PropTypes.bool,
    onClick: PropTypes.func,
    theme: PropTypes.string,
    focusedRef: PropTypes.object,
    onParentKeyPress: PropTypes.func
};

class ThemeMenu extends React.PureComponent {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleKeyPress',
            'handleKeyPressOpenMenu',
            'handleMove',
            'handleOnOpen',
            'handleOnClose',
            'setFocusedRef',
            'setRef'
        ]);

        this.state = {focusedIndex: -1};
        this.enabledThemes = [DEFAULT_THEME, HIGH_CONTRAST_THEME];
        this.itemRefs = this.enabledThemes.map(() => React.createRef());
    }

    static contextType = MenuRefContext;
    
    setRef (component) {
        this.selectedRef = component;
    }

    handleKeyPress (e) {
        if (this.context.isTopMenu(this.props.focusedRef)) {
            this.handleKeyPressOpenMenu(e);
        } else if (!this.context.isOpenMenu(this.props.focusedRef) && (e.key === ' ' || e.key === 'ArrowRight')) {
            e.preventDefault();
            this.handleOnOpen();
        }
    }

    handleKeyPressOpenMenu (e) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.handleMove(1);
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.handleMove(-1);
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            this.props.onChangeTheme(this.enabledThemes[this.state.focusedIndex]);
            this.handleOnClose();
        }

        if (e.key === 'ArrowLeft' || e.key === 'Escape') {
            e.preventDefault();
            this.handleOnClose();
        }
    }

    handleMove (move) {
        const newIndex = (this.state.focusedIndex + move + this.itemRefs.length) % this.itemRefs.length;
        this.setState({focusedIndex: newIndex}, () => {
            const ref = this.itemRefs[this.state.focusedIndex];
            if (ref && ref.current) ref.current.focus();
        });
    }

    handleOnOpen () {
        if (this.context.isTopMenu(this.props.focusedRef)) return;

        this.props.onRequestOpen();
        this.setState({focusedIndex: 0}, () => {
            this.setFocusedRef(this.itemRefs[this.state.focusedIndex]);
        });

        this.context.addInner(this.props.focusedRef);
    }

    handleOnClose () {
        this.context.removeByRef(this.props.focusedRef);
        this.setState({focusedIndex: -1}, () => {
            this.setFocusedRef(this.props.focusedRef);
        });
        closeThemeMenu();
    }

    setFocusedRef (component) {
        this.focusedRef = component;
        if (this.focusedRef && this.focusedRef.current) {
            this.focusedRef.current.focus();
        }
    }

    render () {
        const {
            focusedRef,
            isRtl,
            onChangeTheme,
            theme
        } = this.props;
        
        const themeInfo = themeMap[theme];

        return (
            <MenuItem
                expanded={this.context.isOpenMenu(focusedRef)}
            >
                <div
                    className={styles.option}
                    onClick={this.handleOnOpen}
                    ref={focusedRef}
                    role="button"
                    aria-label="Theme Menu"
                    tabIndex={-1}
                    onKeyDown={this.handleKeyPress}
                >
                    <img
                        src={themeInfo.icon}
                        style={{width: 24}}
                    />
                    <span className={styles.submenuLabel}>
                        <FormattedMessage
                            defaultMessage="Color Mode"
                            description="Color mode sub-menu"
                            id="gui.menuBar.colorMode"
                        />
                    </span>
                    <img
                        className={styles.expandCaret}
                        src={dropdownCaret}
                    />
                </div>
                <Submenu place={isRtl ? 'left' : 'right'}>
                    {this.enabledThemes.map((enabledTheme, index) => (
                        <ThemeMenuItem
                            key={enabledTheme}
                            isSelected={theme === enabledTheme}
                            // eslint-disable-next-line react/jsx-no-bind
                            onClick={() => onChangeTheme(enabledTheme)}
                            theme={enabledTheme}
                            focusedRef={this.itemRefs[index]}
                            onParentKeyPress={this.handleKeyPress}
                        />)
                    )}
                </Submenu>
            </MenuItem>
        );
    }
}

ThemeMenu.propTypes = {
    focusedRef: PropTypes.object,
    isRtl: PropTypes.bool,
    onChangeTheme: PropTypes.func,
    // eslint-disable-next-line react/no-unused-prop-types
    onRequestCloseSettings: PropTypes.func,
    onRequestOpen: PropTypes.func,
    theme: PropTypes.string
};

const mapStateToProps = state => ({
    isRtl: state.locales.isRtl,
    theme: state.scratchGui.theme.theme
});

const mapDispatchToProps = (dispatch, ownProps) => ({
    onChangeTheme: theme => {
        dispatch(setTheme(theme));
        ownProps.onRequestCloseSettings();
        persistTheme(theme);
    },
    onRequestOpen: () => dispatch(openThemeMenu())
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(ThemeMenu);
