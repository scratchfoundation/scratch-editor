const test = require('tap').test;
const fs = require('fs');
const path = require('path');
const {JSDOM} = require('jsdom');

const sanitizeSvg = require('../src/sanitize-svg');

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink';

const {window} = new JSDOM();
const domParser = new window.DOMParser();

// Parse the way loadSvgString does
const parseXml = xmlString => domParser.parseFromString(xmlString, 'text/xml');

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

        t.equal(testSanitizedSvgString, correctSvgString,
            `sanitizing ${rawSvgFilename} should match ${correctSvgFilename}`);
    });
    t.end();
});

const declarePrefix = (svgText, prefix) =>
    svgText.replace(/<svg\b/, `<svg xmlns:${prefix}="${SVG_NAMESPACE}"`);

const prefixAllTags = (svgText, prefix) =>
    svgText.replace(/<(\/?)([A-Za-z][\w.-]*)(?=[\s/>])/g, `<$1${prefix}:$2`);

// Inkscape and other tools can write every SVG element with a namespace prefix, like <svg:path>. Rewrite each
// fixture that way, and check that it sanitizes exactly like the unprefixed version, so that everything the fixtures
// expect to be stripped is still stripped when prefixed.
test('prefixed versions of fixtures sanitize the same as unprefixed versions', t => {
    const dirPath = path.resolve(__dirname, './fixtures/');
    const rawSvgFilenames = fs.readdirSync(dirPath)
        .filter(filename => filename.endsWith('.sanitized.svg'))
        .map(filename => filename.replace('.sanitized.svg', '.svg'));
    for (const prefix of ['svg']) {
        for (const rawSvgFilename of rawSvgFilenames) {
            const rawSvgString = fs.readFileSync(path.resolve(dirPath, rawSvgFilename)).toString();
            if (rawSvgString.includes(`xmlns:${prefix}=`)) continue;

            const declaredSvgString = declarePrefix(rawSvgString, prefix);
            const prefixedSvgString = prefixAllTags(declaredSvgString, prefix);
            t.not(prefixedSvgString, declaredSvgString, `${rawSvgFilename} should have tags to prefix`);
            t.equal(sanitizeSvg.sanitizeSvgText(prefixedSvgString), sanitizeSvg.sanitizeSvgText(declaredSvgString),
                `sanitizing ${rawSvgFilename} with "${prefix}:" tag prefixes should match the unprefixed result`);
        }
    }
    t.end();
});

test('keeps the SVG namespace when only a prefix is declared for it', t => {
    const doc = parseXml(sanitizeSvg.sanitizeSvgText(
        `<svg:svg xmlns:svg="${SVG_NAMESPACE}" width="10" height="10"><svg:rect width="5" height="5"/></svg:svg>`
    ));
    t.equal(doc.documentElement.localName, 'svg');
    t.equal(doc.documentElement.namespaceURI, SVG_NAMESPACE);
    t.equal(doc.getElementsByTagNameNS(SVG_NAMESPACE, 'rect').length, 1);
    t.end();
});

// The fixups in fixupSvgString rely on DOMPurify's normalized output, so they run after it. These cases break if
// they run on the raw input instead.
test('fixups still handle input that DOMPurify normalizes', t => {
    const keepsContentBetweenScripts = sanitizeSvg.sanitizeSvgText(
        `<svg xmlns="${SVG_NAMESPACE}"><script>a()</script><rect id="keep-me"/><script>b()</script></svg>`
    );
    t.match(keepsContentBetweenScripts, /<rect id="keep-me"/, 'keeps content between two scripts');

    const newlineAfterSvg = parseXml(sanitizeSvg.sanitizeSvgText(
        '<svg\n  width="10" height="10"><rect width="5" height="5"/></svg>'
    ));
    t.equal(newlineAfterSvg.documentElement.namespaceURI, SVG_NAMESPACE, 'adds xmlns after a newline in <svg');

    const svgInComment = parseXml(sanitizeSvg.sanitizeSvgText(
        '<!-- exported from <svg editor> --><svg width="10" height="10"><rect width="5" height="5"/></svg>'
    ));
    t.equal(svgInComment.documentElement.namespaceURI, SVG_NAMESPACE, 'adds xmlns to the root, not a comment');

    const spacedImageHref = parseXml(sanitizeSvg.sanitizeSvgText(
        `<svg xmlns="${SVG_NAMESPACE}" xmlns:xlink="${XLINK_NAMESPACE}">` +
        '<image xlink:href = "data:img/png;base64,iVBORw0KGgo="/></svg>'
    ));
    t.match(spacedImageHref.getElementsByTagName('image')[0].getAttributeNS(XLINK_NAMESPACE, 'href'),
        /^data:image\/png;/, 'corrects the mime type with spaces around =');
    t.end();
});
