const test = require('tap').test;
const fs = require('fs');
const path = require('path');

const sanitizeSvg = require('../src/sanitize-svg');

// find all svg fixtures with filenames ending '.sanitized.svg', and compare their
// content to the result when we run sanitizeSvg.sanitizeSvgText() on the raw
// versions
test('compare svg content before and after sanitize-svg sanitizes it', t => {
    const dirPath = path.resolve(__dirname, './fixtures/');
    const fixtureFilenames = fs.readdirSync(dirPath);
    // for simplicity, we'll call those existing '.sanitized.svg' files "correct"
    const correctSvgFilenames = [];
    fixtureFilenames.forEach(filename => {
        if (/^.*.sanitized.svg$/.test(filename)) {
            correctSvgFilenames.push(filename);
        }
    });
    correctSvgFilenames.forEach(correctSvgFilename => {
        // load raw svg content and run it through sanitizeSvg.sanitizeSvgText()
        const rawSvgFilename = correctSvgFilename.replace('.sanitized.svg', '.svg');
        const rawSvgFilePath = path.resolve(__dirname, `./fixtures/${rawSvgFilename}`);
        const rawSvgString = fs.readFileSync(rawSvgFilePath).toString();
        const testSanitizedSvgString = sanitizeSvg.sanitizeSvgText(rawSvgString);

        // load "correct" content
        const correctSvgFilePath = path.resolve(__dirname, `./fixtures/${correctSvgFilename}`);
        const correctSvgString = fs.readFileSync(correctSvgFilePath).toString();

        t.equals(testSanitizedSvgString, correctSvgString);
    });
    t.end();
});
