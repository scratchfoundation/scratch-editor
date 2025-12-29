import classNames from 'classnames';
import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {FormattedMessage} from 'react-intl';
import {connect} from 'react-redux';
import locales from 'scratch-l10n';

import check from './check.svg';
import {MenuItem, Submenu} from '../menu/menu.jsx';
import languageIcon from '../language-selector/language-icon.svg';
import {closeLanguageMenu, languageMenuOpen, openLanguageMenu} from '../../reducers/menus.js';
import {selectLocale} from '../../reducers/locales.js';

import styles from './settings-menu.css';

import dropdownCaret from './dropdown-caret.svg';
import {BaseMenu} from './base-menu';

class LanguageMenu extends BaseMenu {
    constructor (props) {
        super(props);
        bindAll(this, [
            'setRef',
            'handleMouseOver'
        ]);

        this.itemRefs = Object.keys(locales).map(() => React.createRef());
    }

    componentDidUpdate (prevProps) {
        // If the submenu has been toggled open, try scrolling the selected option into view.
        if (!prevProps.menuOpen && this.props.menuOpen && this.selectedRef) {
            this.selectedRef.scrollIntoView({block: 'center'});
        }
    }

    setRef (component) {
        this.selectedRef = component;
    }

    handleMouseOver () {
        // If we are using hover rather than clicks for submenus, scroll the selected option into view
        if (!this.props.menuOpen && this.selectedRef) {
            this.selectedRef.scrollIntoView({block: 'center'});
            this.refocusRef(this.selectedRef);
        }
    }

    render () {
        const {
            currentLocale,
            menuRef,
            isRtl,
            onChangeLanguage
        } = this.props;

        return (
            <MenuItem expanded={this.isExpanded()}>
                <div
                    className={styles.option}
                    onClick={this.handleOnOpen}
                    onMouseOver={this.handleMouseOver}
                    ref={menuRef}
                    aria-label="Language Menu"
                    aria-expanded={this.isExpanded()}
                    role="button"
                    tabIndex={-1}
                    onKeyDown={this.handleKeyPress}
                >
                    <img
                        className={styles.icon}
                        src={languageIcon}
                    />
                    <span className={styles.submenuLabel}>
                        <FormattedMessage
                            defaultMessage="Language"
                            description="Language sub-menu"
                            id="gui.menuBar.language"
                        />
                    </span>
                    <img
                        className={styles.expandCaret}
                        src={dropdownCaret}
                    />
                </div>
                <Submenu
                    className={styles.languageSubmenu}
                    place={isRtl ? 'left' : 'right'}
                >
                    {
                        Object.keys(locales)
                            .map((locale, index) => {
                                const isSelected = currentLocale === locale;

                                return (<MenuItem
                                    key={locale}
                                    className={styles.languageMenuItem}
                                    // eslint-disable-next-line react/jsx-no-bind
                                    onClick={() => onChangeLanguage(locale)}
                                    menuRef={this.itemRefs[index]}
                                    onParentKeyPress={this.handleKeyPressOpenMenu}
                                    isSelected={isSelected}
                                >
                                    <img
                                        className={classNames(styles.check, {
                                            [styles.selected]: isSelected
                                        })}
                                        src={check}
                                        {...(isSelected && {ref: this.setRef})}
                                    />
                                    {locales[locale].name}
                                </MenuItem>);
                            })
                    }
                </Submenu>
            </MenuItem>
        );
    }
}

LanguageMenu.propTypes = {
    currentLocale: PropTypes.string,
    menuRef: PropTypes.shape({current: PropTypes.instanceOf(Element)}),
    isRtl: PropTypes.bool,
    menuOpen: PropTypes.bool,
    onChangeLanguage: PropTypes.func,
    onOpen: PropTypes.func,
    onClose: PropTypes.func
};

const mapStateToProps = state => ({
    currentLocale: state.locales.locale,
    isRtl: state.locales.isRtl,
    menuOpen: languageMenuOpen(state),
    messagesByLocale: state.locales.messagesByLocale
});

const mapDispatchToProps = dispatch => ({
    onChangeLanguage: locale => {
        dispatch(selectLocale(locale));
    },
    onOpen: () => dispatch(openLanguageMenu()),
    onClose: () => dispatch(closeLanguageMenu())
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(LanguageMenu);
