import React, {useCallback} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import {useIntl, defineMessage} from 'react-intl';
import {connect} from 'react-redux';

import MenuBarMenu from './menu-bar-menu.jsx';
import Button from '../button/button.jsx';
import {MenuItem} from '../menu/menu.jsx';
import useMenuNavigation from '../../hooks/use-menu-navigation';

import stylesMenuBar from './menu-bar.css';
import stylesAboutMenu from './about-menu.css';
import aboutIcon from './icon--about.svg';

const aboutMenuMessage = defineMessage({
    id: 'gui.aria.aboutMenu',
    defaultMessage: 'About menu',
    description: 'accessibility label for About menu'
});

const AboutButton = props => {
    const intl = useIntl();

    return (<Button
        className={classNames(stylesMenuBar.menuBarItem, stylesMenuBar.hoverable)}
        iconClassName={stylesAboutMenu.aboutIcon}
        iconSrc={aboutIcon}
        onClick={props.onClick}
        aria-label={intl.formatMessage(aboutMenuMessage)}
    />);
};

AboutButton.propTypes = {
    onClick: PropTypes.func.isRequired
};

const AboutMenu = ({
    onClick,
    isRtl,
    depth
}) => {
    if (!onClick) {
        // hide the button
        return null;
    }
    if (typeof onClick === 'function') {
        // make a button which calls a function
        return <AboutButton onClick={onClick} />;
    }

    // assume it's an array of objects
    // each item must have a 'title' FormattedMessage and a 'handleClick' function
    // generate a menu with items for each object in the array

    const intl = useIntl();

    const {
        menuRef,
        isExpanded,
        handleOnOpen,
        handleOnClose,
        handleKeyDown,
        handleKeyDownOpenMenu
    } = useMenuNavigation({
        depth,
        isRtl
    });

    const wrapAboutMenuCallback = useCallback(
        callback => () => {
            callback();
            handleOnClose();
        },
        [handleOnClose]
    );

    return (
        <button
            className={classNames(stylesMenuBar.menuBarItem, stylesMenuBar.hoverable, {
                [stylesMenuBar.active]: isExpanded()
            })}
            onClick={handleOnOpen}
            onKeyDown={handleKeyDown}
            aria-label={intl.formatMessage(aboutMenuMessage)}
            aria-expanded={isExpanded()}
            ref={menuRef}
        >
            <img
                className={stylesAboutMenu.aboutIcon}
                src={aboutIcon}
            />
            <MenuBarMenu
                className={classNames(stylesMenuBar.menuBarMenu)}
                open={isExpanded()}
                place={isRtl ? 'right' : 'left'}
                onRequestClose={handleOnClose}
            >
                {
                    onClick.map(itemProps => (
                        <MenuItem
                            key={itemProps.title}
                            onClick={wrapAboutMenuCallback(itemProps.onClick)}
                            onParentKeyDown={handleKeyDownOpenMenu}
                            isDataMenuItem
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
    isRtl: PropTypes.bool,
    onClick: PropTypes.oneOfType([
        PropTypes.func, // button mode: call this callback when the About button is clicked
        PropTypes.arrayOf( // menu mode: list of items in the About menu
            PropTypes.shape({
                title: PropTypes.string, // text for the menu item
                onClick: PropTypes.func // call this callback when the menu item is clicked
            })
        )
    ]),
    depth: PropTypes.number
};

const mapStateToProps = state => ({
    isRtl: state.locales.isRtl
});

export default connect(mapStateToProps)(AboutMenu);
