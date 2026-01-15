import React, {useRef} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import {useIntl, defineMessage} from 'react-intl';
import {connect} from 'react-redux';

import MenuBarMenu from './menu-bar-menu.jsx';
import Button from '../button/button.jsx';
import {MenuItem} from '../menu/menu.jsx';
import useMenuNavigation from '../../hooks/use-menu-navigation.jsx';

import styles from './menu-bar.css';
import aboutIcon from './icon--about.svg';
import propTypes from '../../lib/prop-types.js';

const aboutMenuMessage = defineMessage({
    id: 'gui.aria.aboutMenu',
    defaultMessage: 'About menu',
    description: 'accessibility label for About menu'
});

const AboutButton = props => {
    const intl = useIntl();

    return (<Button
        className={classNames(styles.menuBarItem, styles.hoverable)}
        iconClassName={styles.aboutIcon}
        iconSrc={aboutIcon}
        onClick={props.onClick}
        aria-label={intl.formatMessage(aboutMenuMessage)}
    />);
};

AboutButton.propTypes = {
    onClick: PropTypes.func.isRequired
};

const AboutMenu = ({
    menuRef,
    onClick,
    isRtl
}) => {
    const intl = useIntl();

    const itemRefs = onClick.map(() => useRef(null));

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

    const wrapAboutMenuCallback = function (callback) {
        return function () {
            callback();
            handleOnClose();
        };
    };

    if (!onClick) {
        // hide the button
        return null;
    }
    if (typeof onClickAbout === 'function') {
        // make a button which calls a function
        return <AboutButton onClick={onClick} />;
    }
    // assume it's an array of objects
    // each item must have a 'title' FormattedMessage and a 'handleClick' function
    // generate a menu with items for each object in the array
    return (
        <button
            className={classNames(styles.menuBarItem, styles.hoverable, {
                [styles.active]: isExpanded()
            })}
            onClick={handleOnOpen}
            onKeyDown={handleKeyPress}
            aria-label={intl.formatMessage(aboutMenuMessage)}
            aria-expanded={isExpanded()}
            ref={menuRef}
        >
            <img
                className={styles.aboutIcon}
                src={aboutIcon}
            />
            <MenuBarMenu
                className={classNames(styles.menuBarMenu)}
                open={isExpanded()}
                place={isRtl ? 'right' : 'left'}
                onRequestClose={handleOnClose}
            >
                {
                    onClick.map((itemProps, index) => (
                        <MenuItem
                            key={itemProps.title}
                            isRtl={isRtl}
                            onClick={wrapAboutMenuCallback(itemProps.onClick)}
                            onParentKeyPress={handleKeyPressOpenMenu}
                            itemRef={itemRefs[index]}
                        >
                            {itemProps.title}
                        </MenuItem>
                    ))
                }
            </MenuBarMenu>
        </button>
    );
};

AboutMenu.propTypes = {
    menuRef: propTypes.ref.isRequired,
    isRtl: PropTypes.bool.isRequired,
    onClick: PropTypes.oneOfType([
        PropTypes.func, // button mode: call this callback when the About button is clicked
        PropTypes.arrayOf( // menu mode: list of items in the About menu
            PropTypes.shape({
                title: PropTypes.string, // text for the menu item
                onClick: PropTypes.func // call this callback when the menu item is clicked
            })
        )
    ])
};

const mapStateToProps = state => ({
    isRtl: state.locales.isRtl
});

export default connect(mapStateToProps)(AboutMenu);
