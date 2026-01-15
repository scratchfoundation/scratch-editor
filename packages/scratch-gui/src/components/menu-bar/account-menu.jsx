import styles from './menu-bar.css';
import classNames from 'classnames';
import React, {useMemo, useRef} from 'react';
import useMenuNavigation from '../../hooks/use-menu-navigation';
import {useIntl, FormattedMessage, defineMessage} from 'react-intl';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import propTypes from '../../lib/prop-types';

import {AccountMenuOptionsPropTypes} from '../../lib/account-menu-options';

import MenuBarMenu from './menu-bar-menu.jsx';
import {MenuSection} from '../menu/menu.jsx';
import MenuItemContainer from '../../containers/menu-item.jsx';
import UserAvatar from './user-avatar.jsx';
import dropdownCaret from './dropdown-caret.svg';

const accountMenu = defineMessage({
    id: 'gui.aria.accountMenu',
    defaultMessage: 'Account menu',
    description: 'accessibility label for account menu'
});

const AccountMenu = ({
    menuRef,
    menuOpts,
    username,
    isRtl,
    onLogOut,
    avatarBadge
}) => {
    const {
        avatarUrl,
        myStuffUrl,
        profileUrl,
        myClassesUrl,
        myClassUrl,
        accountSettingsUrl,
        canLogout
    } = menuOpts;

    const intl = useIntl();

    const profileRef = useRef(null);
    const myStuffRef = useRef(null);
    const myClassesRef = useRef(null);
    const myClassRef = useRef(null);
    const accountSettingsRef = useRef(null);
    const logoutRef = useRef(null);

    const itemRefs = useMemo(() => [
        ...(profileUrl ? [profileRef] : []),
        ...(myStuffUrl ? [myStuffRef] : []),
        ...(myClassesUrl ? [myClassesRef] : []),
        ...(myClassUrl ? [myClassRef] : []),
        ...(accountSettingsUrl ? [accountSettingsRef] : []),
        ...(canLogout ? [logoutRef] : [])
    ], [profileUrl, myStuffUrl, myClassesUrl, myClassUrl, accountSettingsUrl, canLogout]);

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
        <React.Fragment>
            <button
                className={classNames(
                    styles.userInfo,
                    styles.menuBarItem,
                    styles.hoverable,
                    {[styles.active]: isExpanded()}
                )}
                onClick={handleOnOpen}
                onKeyDown={handleKeyPress}
                aria-label={intl.formatMessage(accountMenu)}
                aria-expanded={isExpanded()}
                ref={menuRef}
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
            </button>
            <MenuBarMenu
                className={classNames(styles.menuBarMenu)}
                open={isExpanded()}
                // note: the Rtl styles are switched here, because this menu is justified
                // opposite all the others
                place={isRtl ? 'right' : 'left'}
                onRequestClose={handleOnClose}
            >
                {profileUrl ? (
                    <MenuItemContainer
                        href={profileUrl}
                        itemRef={profileRef}
                        onParentKeyPress={handleKeyPressOpenMenu}
                    >
                        <FormattedMessage
                            defaultMessage="Profile"
                            description="Text to link to my user profile, in the account navigation menu"
                            id="gui.accountMenu.profile"
                        />
                    </MenuItemContainer>
                ) : null}
    
                {myStuffUrl ? (
                    <MenuItemContainer
                        href={myStuffUrl}
                        itemRef={myStuffRef}
                        onParentKeyPress={handleKeyPressOpenMenu}
                    >
                        <FormattedMessage
                            defaultMessage="My Stuff"
                            description="Text to link to list of my projects, in the account navigation menu"
                            id="gui.accountMenu.myStuff"
                        />
                    </MenuItemContainer>
                ) : null}
    
                {myClassesUrl ? (
                    <MenuItemContainer
                        href={myClassesUrl}
                        itemRef={myClassesRef}
                        onParentKeyPress={handleKeyPressOpenMenu}
                    >
                        <FormattedMessage
                            defaultMessage="My Classes"
                            description="Text to link to my classes (if I am a teacher), in the account navigation menu"
                            id="gui.accountMenu.myClasses"
                        />
                    </MenuItemContainer>
                ) : null}
    
                {myClassUrl ? (
                    <MenuItemContainer
                        href={myClassUrl}
                        itemRef={myClassRef}
                        onParentKeyPress={handleKeyPressOpenMenu}
                    >
                        <FormattedMessage
                            defaultMessage="My Class"
                            description="Text to link to my class (if I am a student), in the account navigation menu"
                            id="gui.accountMenu.myClass"
                        />
                    </MenuItemContainer>
                ) : null}
    
                {accountSettingsUrl ? (
                    <MenuItemContainer
                        href={accountSettingsUrl}
                        itemRef={accountSettingsRef}
                        onParentKeyPress={handleKeyPressOpenMenu}
                    >
                        <FormattedMessage
                            defaultMessage="Account settings"
                            description="Text to link to my account settings, in the account navigation menu"
                            id="gui.accountMenu.accountSettings"
                        />
                    </MenuItemContainer>
                ) : null}
    
                {canLogout ? (
                    <MenuSection>
                        <MenuItemContainer
                            onClick={onLogOut}
                            itemRef={logoutRef}
                            onParentKeyPress={handleKeyPressOpenMenu}
                        >
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
};

AccountMenu.propTypes = {
    menuRef: propTypes.ref.isRequired,
    menuOpts: AccountMenuOptionsPropTypes,
    isRtl: PropTypes.bool,
    username: PropTypes.string,
    onLogOut: PropTypes.func,
    avatarBadge: PropTypes.number
};

const mapStateToProps = state => ({
    isRtl: state.locales.isRtl
});

export default connect(
    mapStateToProps
)(AccountMenu);
