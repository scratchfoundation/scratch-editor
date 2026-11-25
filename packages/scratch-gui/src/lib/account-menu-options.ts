import PropTypes from 'prop-types';

/**
 * A custom item in the account menu. Provide an `href` to navigate to, an `onClick` handler, or both
 * (in which case `onClick` takes precedence, matching the behavior of the built-in menu items).
 */
export type AccountMenuItem = {
    /** Unique identifier, used as the React key. */
    id: string;
    /** Already-localized text to display. */
    label: string;
} & ({href: string; onClick?: () => void} | {href?: string; onClick: () => void});

export interface AccountMenuOptions {
    canHaveSession: boolean;

    canRegister?: boolean;
    canLogin?: boolean;
    canLogout?: boolean;

    avatarUrl?: string;
    myStuffUrl?: string;
    /** When set, a "My Dashboard" button is shown in the menu bar instead of the "My Stuff" button. */
    dashboardUrl?: string;
    profileUrl?: string;
    myClassesUrl?: string;
    myClassUrl?: string;
    accountSettingsUrl?: string;

    /**
     * When set, replaces the built-in account menu items (profile, my stuff, my classes, my class
     * and account settings) with these items, in the given order. An empty array leaves only
     * "Sign out" in the menu.
     *
     * Not affected by this option:
     * - "Sign out", which is still controlled by `canLogout`
     * - the "My Stuff" button in the menu bar, which is still controlled by `myStuffUrl` (or `dashboardUrl`)
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
    dashboardUrl: PropTypes.string,
    profileUrl: PropTypes.string,
    myClassesUrl: PropTypes.string,
    myClassUrl: PropTypes.string,
    accountSettingsUrl: PropTypes.string,

    menuItems: PropTypes.arrayOf(AccountMenuItemPropTypes.isRequired)
});
