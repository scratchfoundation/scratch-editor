import cookie from 'cookie';

import {DEFAULT_MODE, HIGH_CONTRAST_MODE} from '.';

const PREFERS_HIGH_CONTRAST_QUERY = '(prefers-contrast: more)';
// Technically what we are persisting is the color mode, but for historical reasons,
// we should continue using 'scratchtheme' as the cookie key.
const COOKIE_KEY = 'scratchtheme';

// Dark mode isn't enabled yet
const isValidColorMode = colorMode => [DEFAULT_MODE, HIGH_CONTRAST_MODE].includes(colorMode);

const systemPreferencesColorMode = () => {
    if (window.matchMedia && window.matchMedia(PREFERS_HIGH_CONTRAST_QUERY).matches) return HIGH_CONTRAST_MODE;

    return DEFAULT_MODE;
};

const detectColorMode = () => {
    const obj = cookie.parse(document.cookie) || {};
    const colorModeCookie = obj.scratchtheme;

    if (isValidColorMode(colorModeCookie)) return colorModeCookie;

    // No cookie set. Fall back to system preferences
    return systemPreferencesColorMode();
};

const persistColorMode = mode => {
    if (!isValidColorMode(mode)) {
        throw new Error(`Invalid color mode: ${mode}`);
    }

    if (systemPreferencesColorMode() === mode) {
        // Clear the cookie to represent using the system preferences
        document.cookie = `${COOKIE_KEY}=;path=/`;
        return;
    }

    const expires = new Date(new Date().setYear(new Date().getFullYear() + 1)).toUTCString();
    document.cookie = `${COOKIE_KEY}=${mode};expires=${expires};path=/`;
};

export {
    detectColorMode,
    persistColorMode
};
