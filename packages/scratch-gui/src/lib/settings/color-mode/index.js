import defaultsDeep from 'lodash.defaultsdeep';
import {defineMessages} from 'react-intl';

import {
    blockColors as darkModeBlockColors,
    extensions as darkModeExtensions
} from './dark';
import {
    blockColors as highContrastBlockColors,
    extensions as highContrastExtensions
} from './high-contrast';
import {blockColors as defaultColors} from './default';

import defaultIcon from './default/icon.svg';
import highContrastIcon from './high-contrast/icon.svg';

const DEFAULT_MODE = 'default';
const HIGH_CONTRAST_MODE = 'high-contrast';
const DARK_MODE = 'dark';

const mergeWithDefaults = colors => defaultsDeep({}, colors, defaultColors);

const messages = defineMessages({
    [DEFAULT_MODE]: {
        id: 'gui.theme.default',
        defaultMessage: 'Original',
        description: 'label for original color mode'
    },
    [DARK_MODE]: {
        id: 'gui.theme.dark',
        defaultMessage: 'Dark',
        description: 'label for dark mode'
    },
    [HIGH_CONTRAST_MODE]: {
        id: 'gui.theme.highContrast',
        defaultMessage: 'High Contrast',
        description: 'label for high contrast mode'
    }
});

const colorModeMap = {
    [DEFAULT_MODE]: {
        blocksMediaFolder: 'blocks-media/default',
        colors: defaultColors,
        extensions: {},
        label: messages[DEFAULT_MODE],
        icon: defaultIcon
    },
    [DARK_MODE]: {
        blocksMediaFolder: 'blocks-media/default',
        colors: mergeWithDefaults(darkModeBlockColors),
        extensions: darkModeExtensions,
        label: messages[DARK_MODE]
    },
    [HIGH_CONTRAST_MODE]: {
        blocksMediaFolder: 'blocks-media/high-contrast',
        colors: mergeWithDefaults(highContrastBlockColors),
        extensions: highContrastExtensions,
        label: messages[HIGH_CONTRAST_MODE],
        icon: highContrastIcon
    }
};

const getColorsForMode = colorMode => {
    const modeInfo = colorModeMap[colorMode];

    if (!modeInfo) {
        throw new Error(`Undefined color mode ${colorMode}`);
    }

    return modeInfo.colors;
};

export {
    DEFAULT_MODE,
    DARK_MODE,
    HIGH_CONTRAST_MODE,
    defaultColors,
    getColorsForMode,
    colorModeMap
};
