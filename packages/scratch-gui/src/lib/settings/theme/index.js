import {defineMessages} from 'react-intl';

const DEFAULT_THEME = 'default';
const CAT_BLOCKS_THEME = 'cat-blocks';

const messages = defineMessages({
    [DEFAULT_THEME]: {
        id: 'gui.blockTheme.default',
        defaultMessage: 'Default',
        description: 'label for default theme'
    },
    [CAT_BLOCKS_THEME]: {
        id: 'gui.blockTheme.catBlocks',
        defaultMessage: 'Cat Blocks',
        description: 'label for cat blocks theme'
    }
});

// Keeping this as a map for consistency with the color modes
const themeMap = {
    [DEFAULT_THEME]: {
        label: messages[DEFAULT_THEME],
        isAvailable: () => true
    },
    [CAT_BLOCKS_THEME]: {
        label: messages[CAT_BLOCKS_THEME],
        // TODO: This should probably also depend on `isTimeTravel2020`,
        // but it should be fine to stay as-is for now.
        isAvailable: userInfo => userInfo.hasActiveMembership
    }
};

export {
    DEFAULT_THEME,
    CAT_BLOCKS_THEME,
    themeMap
};
