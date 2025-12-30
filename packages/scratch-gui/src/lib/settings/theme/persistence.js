import cookie from 'cookie';

import {DEFAULT_THEME, CAT_BLOCKS_THEME} from '.';

const COOKIE_KEY = 'scratchblockstheme';

const isValidTheme = theme => [DEFAULT_THEME, CAT_BLOCKS_THEME].includes(theme);

// TODO: The correct way of implementing this would be to know the user info here
// (e.g., membership status) and filter out unavailable themes. However, there is no easy way to currently do this,
// as user info is generally passed as component properties to GUI, rather than through redux.
// For now, we'll take the user preference here as-is and switch to default theme if needed,
// once we have the user info available.
const detectTheme = () => {
    const obj = cookie.parse(document.cookie) || {};
    const themeCookie = obj[COOKIE_KEY];

    if (isValidTheme(themeCookie)) return themeCookie;

    return DEFAULT_THEME;
};

const persistTheme = theme => {
    if (!isValidTheme(theme)) {
        throw new Error(`Invalid theme: ${theme}`);
    }

    const expires = new Date(new Date().setYear(new Date().getFullYear() + 1)).toUTCString();
    document.cookie = `${COOKIE_KEY}=${theme};expires=${expires};path=/`;
};

export {
    detectTheme,
    persistTheme
};
