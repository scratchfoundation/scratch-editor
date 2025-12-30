/*
NOTE: this file only temporarily resides in scratch-gui.
Nearly identical code appears in scratch-www, and the two should
eventually be consolidated.
*/

import classNames from 'classnames';
import {FormattedMessage} from 'react-intl';
import PropTypes from 'prop-types';
import React from 'react';

import MenuBarMenu from './menu-bar-menu.jsx';
import {MenuSection} from '../menu/menu.jsx';
import MenuItemContainer from '../../containers/menu-item.jsx';
import UserAvatar from './user-avatar.jsx';
import dropdownCaret from './dropdown-caret.svg';

import styles from './account-nav.css';

const AccountNavComponent = ({
    className,
    isOpen,
    isRtl,
    menuBarMenuClassName,
    onClick,
    onClose,
    onLogOut,
    profileUrl,
    myStuffUrl,
    avatarUrl,
    myClassesUrl,
    myClassUrl,
    accountSettingsUrl,
    username,
    avatarBadge
}) => (
    <React.Fragment>
        <div
            className={classNames(
                styles.userInfo,
                className
            )}
            onClick={onClick}
        >
            {avatarUrl ? (
                <UserAvatar
                    className={styles.avatar}
                    imageUrl={avatarUrl}
                    showAvatarBadge={!!avatarBadge}
                />
            ) : null}
            <span className={styles.profileName}>
                {username}
            </span>
            <div className={styles.dropdownCaretPosition}>
                <img
                    className={styles.dropdownCaretIcon}
                    src={dropdownCaret}
                />
            </div>
        </div>
        <MenuBarMenu
            className={menuBarMenuClassName}
            open={isOpen}
            // note: the Rtl styles are switched here, because this menu is justified
            // opposite all the others
            place={isRtl ? 'right' : 'left'}
            onRequestClose={onClose}
        >
            {profileUrl ? (
                <MenuItemContainer href={profileUrl}>
                    <FormattedMessage
                        defaultMessage="Profile"
                        description="Text to link to my user profile, in the account navigation menu"
                        id="gui.accountMenu.profile"
                    />
                </MenuItemContainer>
            ) : null}

            {myStuffUrl ? (
                <MenuItemContainer href={myStuffUrl}>
                    <FormattedMessage
                        defaultMessage="My Stuff"
                        description="Text to link to list of my projects, in the account navigation menu"
                        id="gui.accountMenu.myStuff"
                    />
                </MenuItemContainer>
            ) : null}

            {myClassesUrl ? (
                <MenuItemContainer href={myClassesUrl}>
                    <FormattedMessage
                        defaultMessage="My Classes"
                        description="Text to link to my classes (if I am a teacher), in the account navigation menu"
                        id="gui.accountMenu.myClasses"
                    />
                </MenuItemContainer>
            ) : null}

            {myClassUrl ? (
                <MenuItemContainer href={myClassUrl}>
                    <FormattedMessage
                        defaultMessage="My Class"
                        description="Text to link to my class (if I am a student), in the account navigation menu"
                        id="gui.accountMenu.myClass"
                    />
                </MenuItemContainer>
            ) : null}

            {accountSettingsUrl ? (
                <MenuItemContainer href={accountSettingsUrl}>
                    <FormattedMessage
                        defaultMessage="Account settings"
                        description="Text to link to my account settings, in the account navigation menu"
                        id="gui.accountMenu.accountSettings"
                    />
                </MenuItemContainer>
            ) : null}

            {onLogOut ? (
                <MenuSection>
                    <MenuItemContainer onClick={onLogOut}>
                        <FormattedMessage
                            defaultMessage="Sign out"
                            description="Text to link to sign out, in the account navigation menu"
                            id="gui.accountMenu.signOut"
                        />
                    </MenuItemContainer>
                </MenuSection>
            ) : null}
        </MenuBarMenu>
    </React.Fragment>
);

AccountNavComponent.propTypes = {
    className: PropTypes.string,

    isOpen: PropTypes.bool,
    isRtl: PropTypes.bool,

    menuBarMenuClassName: PropTypes.string,

    onClick: PropTypes.func,
    onClose: PropTypes.func,
    onLogOut: PropTypes.func,

    username: PropTypes.string,
    avatarBadge: PropTypes.number,

    avatarUrl: PropTypes.string,
    myStuffUrl: PropTypes.string,
    profileUrl: PropTypes.string,
    myClassesUrl: PropTypes.string,
    myClassUrl: PropTypes.string,
    accountSettingsUrl: PropTypes.string
};

export default AccountNavComponent;
