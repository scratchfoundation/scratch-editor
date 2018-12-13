const test = require('tap').test;
const fs = require('fs');
const path = require('path');
const DOMParser = require('xmldom').DOMParser;
const fixupSvgString = require('../src/fixup-svg-string');

// The browser DOMParser throws on errors by default, replicate that here
// by customizing the error callback to throw (defaults to logging)
const domParser = new DOMParser({
    errorHandler: {
        error: e => {
            throw new Error(e);
        }
    }
});

test('fixupSvgString should make parsing fixtures not throw', t => {
    const filePath = path.resolve(__dirname, './fixtures/hearts.svg');
    const svgString = fs.readFileSync(filePath)
        .toString();
    const fixed = fixupSvgString(svgString);

    t.notThrow(() => {
        domParser.parseFromString(fixed, 'text/xml');
    });
    t.end();
});
