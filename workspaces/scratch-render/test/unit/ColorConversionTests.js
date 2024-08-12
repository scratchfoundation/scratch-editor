const {test, Test} = require('tap');

const {rgbToHsv, hsvToRgb} = require('../../src/util/color-conversions');

Test.prototype.addAssert('colorsAlmostEqual', 2, function (found, wanted, message, extra) {
    /* eslint-disable no-invalid-this */
    message += `: found ${JSON.stringify(Array.from(found))}, wanted ${JSON.stringify(Array.from(wanted))}`;

    // should always return another assert call, or
    // this.pass(message) or this.fail(message, extra)
    if (found.length !== wanted.length) {
        return this.fail(message, extra);
    }

    for (let i = 0; i < found.length; i++) {
        // smallest meaningful difference--detects changes in hue value after rounding
        if (Math.abs(found[i] - wanted[i]) >= 0.5 / 360) {
            return this.fail(message, extra);
        }
    }

    return this.pass(message);
    /* eslint-enable no-invalid-this */
});

test('RGB to HSV', t => {
    const dst = [0, 0, 0];
    t.colorsAlmostEqual(rgbToHsv([255, 255, 255], dst), [0, 0, 1], 'white');
    t.colorsAlmostEqual(rgbToHsv([0, 0, 0], dst), [0, 0, 0], 'black');
    t.colorsAlmostEqual(rgbToHsv([127, 127, 127], dst), [0, 0, 0.498], 'grey');
    t.colorsAlmostEqual(rgbToHsv([255, 255, 0], dst), [0.167, 1, 1], 'yellow');
    t.colorsAlmostEqual(rgbToHsv([1, 0, 0], dst), [0, 1, 0.00392], 'dark red');

    t.end();
});

test('HSV to RGB', t => {
    const dst = new Uint8ClampedArray(3);
    t.colorsAlmostEqual(hsvToRgb([0, 1, 1], dst), [255, 0, 0], 'red');
    t.colorsAlmostEqual(hsvToRgb([1, 1, 1], dst), [255, 0, 0], 'red (hue of 1)');
    t.colorsAlmostEqual(hsvToRgb([0.5, 1, 1], dst), [0, 255, 255], 'cyan');
    t.colorsAlmostEqual(hsvToRgb([1.5, 1, 1], dst), [0, 255, 255], 'cyan (hue of 1.5)');
    t.colorsAlmostEqual(hsvToRgb([0, 0, 0], dst), [0, 0, 0], 'black');
    t.colorsAlmostEqual(hsvToRgb([0.5, 1, 0], dst), [0, 0, 0], 'black (with hue and saturation)');
    t.colorsAlmostEqual(hsvToRgb([0, 1, 0.00392], dst), [1, 0, 0], 'dark red');

    t.end();
});
