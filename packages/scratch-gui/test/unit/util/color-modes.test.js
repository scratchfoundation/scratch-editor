import {
    DARK_MODE,
    defaultColors,
    DEFAULT_MODE,
    getColorsForMode,
    HIGH_CONTRAST_MODE
} from '../../../src/lib/settings/color-mode';
import {injectExtensionBlockMode, injectExtensionCategoryMode} from '../../../src/lib/settings/color-mode/blockHelpers';
import {detectColorMode, persistColorMode} from '../../../src/lib/settings/color-mode/persistence';

jest.mock('../../../src/lib/settings/color-mode/default');
jest.mock('../../../src/lib/settings/color-mode/dark');

describe('color modes', () => {
    let serializeToString;

    describe('core functionality', () => {
        test('provides the default color mode colors', () => {
            expect(defaultColors.motion.primary).toEqual('#111111');
        });

        test('returns the dark mode', () => {
            const colors = getColorsForMode(DARK_MODE);

            expect(colors.motion.primary).toEqual('#AAAAAA');
        });

        test('uses default color mode colors when not specified', () => {
            const colors = getColorsForMode(DARK_MODE);

            expect(colors.motion.secondary).toEqual('#222222');
        });
    });

    describe('block helpers', () => {
        beforeEach(() => {
            serializeToString = jest.fn(() => 'mocked xml');

            class XMLSerializer {
                constructor () {
                    this.serializeToString = serializeToString;
                }
            }

            global.XMLSerializer = XMLSerializer;
        });

        test('updates extension block colors based on color mode', () => {
            const blockInfoJson = {
                type: 'dummy_block',
                colour: '#0FBD8C',
                colourSecondary: '#0DA57A',
                colourTertiary: '#0B8E69'
            };

            const updated = injectExtensionBlockMode(blockInfoJson, DARK_MODE);

            expect(updated).toEqual({
                type: 'dummy_block',
                colour: '#FFFFFF',
                colourSecondary: '#EEEEEE',
                colourTertiary: '#DDDDDD'
            });
            // The original value was not modified
            expect(blockInfoJson.colour).toBe('#0FBD8C');
        });

        test('updates extension block icon based on color mode', () => {
            const blockInfoJson = {
                type: 'pen_block',
                args0: [
                    {
                        type: 'field_image',
                        src: 'original'
                    }
                ],
                colour: '#0FBD8C',
                colourSecondary: '#0DA57A',
                colourTertiary: '#0B8E69'
            };

            const updated = injectExtensionBlockMode(blockInfoJson, DARK_MODE);

            expect(updated).toEqual({
                type: 'pen_block',
                args0: [
                    {
                        type: 'field_image',
                        src: 'darkPenIcon'
                    }
                ],
                colour: '#FFFFFF',
                colourSecondary: '#EEEEEE',
                colourTertiary: '#DDDDDD'
            });
            // The original value was not modified
            expect(blockInfoJson.args0[0].src).toBe('original');
        });

        test('bypasses updates if using the default color mode', () => {
            const blockInfoJson = {
                type: 'dummy_block',
                colour: '#0FBD8C',
                colourSecondary: '#0DA57A',
                colourTertiary: '#0B8E69'
            };

            const updated = injectExtensionBlockMode(blockInfoJson, DEFAULT_MODE);

            expect(updated).toEqual({
                type: 'dummy_block',
                colour: '#0FBD8C',
                colourSecondary: '#0DA57A',
                colourTertiary: '#0B8E69'
            });
        });

        test('updates extension category based on color mode', () => {
            const dynamicBlockXML = [
                {
                    id: 'pen',
                    xml: '<category name="Pen" id="pen" colour="#0FBD8C" secondaryColour="#0DA57A"></category>'
                }
            ];

            injectExtensionCategoryMode(dynamicBlockXML, DARK_MODE);

            // XMLSerializer is not available outside the browser.
            // Verify the mocked XMLSerializer.serializeToString is called with updated colors.
            expect(serializeToString.mock.calls[0][0].documentElement.getAttribute('colour')).toBe('#FFFFFF');
            expect(serializeToString.mock.calls[0][0].documentElement.getAttribute('secondaryColour')).toBe('#DDDDDD');
            expect(serializeToString.mock.calls[0][0].documentElement.getAttribute('iconURI')).toBe('darkPenIcon');
        });
    });

    describe('color mode persistence', () => {
        test('returns the color mode stored in a cookie', () => {
            window.document.cookie = `scratchtheme=${HIGH_CONTRAST_MODE}`;

            const colorMode = detectColorMode();

            expect(colorMode).toEqual(HIGH_CONTRAST_MODE);
        });

        test('returns the system color mode when no cookie', () => {
            window.document.cookie = 'scratchtheme=';

            const colorMode = detectColorMode();

            expect(colorMode).toEqual(DEFAULT_MODE);
        });

        test('persists color mode to cookie', () => {
            window.document.cookie = 'scratchtheme=';

            persistColorMode(HIGH_CONTRAST_MODE);

            expect(window.document.cookie).toEqual(`scratchtheme=${HIGH_CONTRAST_MODE}`);
        });

        test('clears color mode when matching system preferences', () => {
            window.document.cookie = `scratchtheme=${HIGH_CONTRAST_MODE}`;

            persistColorMode(DEFAULT_MODE);

            expect(window.document.cookie).toEqual('scratchtheme=');
        });
    });
});
