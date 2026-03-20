import stylesAccountMenu from './account-menu.css';
import stylesMenuBar from './menu-bar.css';
import classNames from 'classnames';
import React from 'react';
import useMenuNavigation from '../../hooks/use-menu-navigation';
import {useIntl, FormattedMessage, defineMessage} from 'react-intl';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';

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
    menuOpts,
    username,
    isRtl,
    onLogOut,
    avatarBadge,
    depth
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

    const {
        isExpanded,
        handleOnOpen,
        handleOnClose,
        handleKeyDown,
        handleKeyDownOpenMenu,
        menuRef
    } = useMenuNavigation({
        depth,
        isRtl
    });

    return (
        <div
            data-menu-item-wrapper
            className={stylesAccountMenu.accountMenu}
            ref={menuRef}
        >
            <button
                onClick={handleOnOpen}
                onKeyDown={handleKeyDown}
                data-menu-item
                className={classNames(
                    stylesAccountMenu.userInfo,
                    stylesMenuBar.menuBarItem,
                    stylesMenuBar.hoverable,
                    {[stylesMenuBar.active]: isExpanded()}
                )}
                aria-label={intl.formatMessage(accountMenu)}
                aria-expanded={isExpanded()}
            >
                {avatarUrl ? (
                    <UserAvatar
                        className={stylesAccountMenu.avatar}
                        wrapperClassName={stylesAccountMenu.avatarWrapper}
                        imageUrl={avatarUrl}
                        showAvatarBadge={!!avatarBadge}
                    />
                ) : null}
                <span className={stylesAccountMenu.profileName}>
                    {username}
                </span>
                <div className={stylesAccountMenu.dropdownCaretPosition}>
                    {/* TODO: consider reapplying stylesMenuBar.dropdownCaretIcon */}
                    <img src={dropdownCaret} />
                </div>
            </button>
            <MenuBarMenu
                className={classNames(stylesMenuBar.menuBarMenu)}
                open={isExpanded()}
                // note: the Rtl styles are switched here, because this menu is justified
                // opposite all the others
                place={isRtl ? 'right' : 'left'}
                onRequestClose={handleOnClose}
            >
                {profileUrl ? (
                    <MenuItemContainer
                        href={profileUrl}
                        isDataMenuItem
                        onParentKeyDown={handleKeyDownOpenMenu}
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
                        isDataMenuItem
                        onParentKeyDown={handleKeyDownOpenMenu}
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
                        isDataMenuItem
                        onParentKeyDown={handleKeyDownOpenMenu}
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
                        isDataMenuItem
                        onParentKeyDown={handleKeyDownOpenMenu}
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
                        isDataMenuItem
                        onParentKeyDown={handleKeyDownOpenMenu}
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
                            isDataMenuItem
                            onParentKeyDown={handleKeyDownOpenMenu}
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
        </div>
    );
};

AccountMenu.propTypes = {
    menuOpts: AccountMenuOptionsPropTypes,
    isRtl: PropTypes.bool,
    username: PropTypes.string,
    onLogOut: PropTypes.func,
    avatarBadge: PropTypes.number,
    depth: PropTypes.number
};

const mapStateToProps = state => ({
    isRtl: state.locales.isRtl
});

export default connect(
    mapStateToProps
)(AccountMenu);
