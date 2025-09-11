const {test} = require('tap');

const {rgbToHsv, hsvToRgb} = require('../../src/util/color-conversions');

const colorsAlmostEqual = (t, found, wanted, message, extra) => {
    message += `: found ${JSON.stringify(Array.from(found))}, wanted ${JSON.stringify(Array.from(wanted))}`;

    // should always return another assert call, or
    // this.pass(message) or this.fail(message, extra)
    if (found.length !== wanted.length) {
        return t.fail(message, extra);
    }

    for (let i = 0; i < found.length; i++) {
        // smallest meaningful difference--detects changes in hue value after rounding
        if (Math.abs(found[i] - wanted[i]) >= 0.5 / 360) {
            return t.fail(message, extra);
        }
    }

    return t.pass(message);
};

test('RGB to HSV', t => {
    const dst = [0, 0, 0];
    colorsAlmostEqual(t, rgbToHsv([255, 255, 255], dst), [0, 0, 1], 'white');
    colorsAlmostEqual(t, rgbToHsv([0, 0, 0], dst), [0, 0, 0], 'black');
    colorsAlmostEqual(t, rgbToHsv([127, 127, 127], dst), [0, 0, 0.498], 'grey');
    colorsAlmostEqual(t, rgbToHsv([255, 255, 0], dst), [0.167, 1, 1], 'yellow');
    colorsAlmostEqual(t, rgbToHsv([1, 0, 0], dst), [0, 1, 0.00392], 'dark red');

    t.end();
});

test('HSV to RGB', t => {
    const dst = new Uint8ClampedArray(3);
    colorsAlmostEqual(t, hsvToRgb([0, 1, 1], dst), [255, 0, 0], 'red');
    colorsAlmostEqual(t, hsvToRgb([1, 1, 1], dst), [255, 0, 0], 'red (hue of 1)');
    colorsAlmostEqual(t, hsvToRgb([0.5, 1, 1], dst), [0, 255, 255], 'cyan');
    colorsAlmostEqual(t, hsvToRgb([1.5, 1, 1], dst), [0, 255, 255], 'cyan (hue of 1.5)');
    colorsAlmostEqual(t, hsvToRgb([0, 0, 0], dst), [0, 0, 0], 'black');
    colorsAlmostEqual(t, hsvToRgb([0.5, 1, 0], dst), [0, 0, 0], 'black (with hue and saturation)');
    colorsAlmostEqual(t, hsvToRgb([0, 1, 0.00392], dst), [1, 0, 0], 'dark red');

    t.end();
});
