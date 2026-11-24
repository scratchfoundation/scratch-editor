import PropTypes from 'prop-types';

/**
 * A custom item in the account menu. Provide an `href` to navigate to, an `onClick` handler, or both
 * (in which case `onClick` takes precedence, matching the behavior of the built-in menu items).
 */
export interface AccountMenuItem {
    /** Unique identifier, used as the React key. */
    id: string;
    /** Already-localized text to display. */
    label: string;
    href?: string;
    onClick?: () => void;
}

export interface AccountMenuOptions {
    canHaveSession: boolean;

    canRegister?: boolean;
    canLogin?: boolean;
    canLogout?: boolean;

    avatarUrl?: string;
    myStuffUrl?: string;
    profileUrl?: string;
    myClassesUrl?: string;
    myClassUrl?: string;
    accountSettingsUrl?: string;

    /**
     * When set, replaces the built-in account menu items (profile, my stuff, my classes, my class
     * and account settings) with these items, in the given order. "Sign out" is not affected and is
     * still controlled by `canLogout`.
     */
    menuItems?: AccountMenuItem[];
}

export const AccountMenuItemPropTypes = PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    href: PropTypes.string,
    onClick: PropTypes.func
});

export const AccountMenuOptionsPropTypes = PropTypes.shape({
    canHaveSession: PropTypes.bool.isRequired,

    canRegister: PropTypes.bool,
    canLogin: PropTypes.bool,
    canLogout: PropTypes.bool,

    avatarUrl: PropTypes.string,
    myStuffUrl: PropTypes.string,
    profileUrl: PropTypes.string,
    myClassesUrl: PropTypes.string,
    myClassUrl: PropTypes.string,
    accountSettingsUrl: PropTypes.string,

    menuItems: PropTypes.arrayOf(AccountMenuItemPropTypes.isRequired)
});
