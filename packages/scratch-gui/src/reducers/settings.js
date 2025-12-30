import {detectColorMode} from '../lib/settings/color-mode/persistence';
import {detectTheme} from '../lib/settings/theme/persistence';

const SET_COLOR_MODE = 'scratch-gui/settings/SET_COLOR_MODE';
const SET_THEME = 'scratch-gui/settings/SET_THEME';

const initialState = {
    colorMode: detectColorMode(),
    theme: detectTheme()
};

const reducer = (state = initialState, action) => {
    switch (action.type) {
    case SET_COLOR_MODE:
        return {...state, colorMode: action.colorMode};
    case SET_THEME:
        return {...state, theme: action.theme};
    default:
        return state;
    }
};

const setColorMode = colorMode => ({
    type: SET_COLOR_MODE,
    colorMode
});

const setTheme = theme => ({
    type: SET_THEME,
    theme
});

export {
    reducer as default,
    initialState as settingsInitialState,
    setColorMode,
    setTheme
};
