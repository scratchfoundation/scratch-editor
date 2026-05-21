const test = require('tap').test;
const fs = require('fs');
const path = require('path');
const {JSDOM} = require('jsdom');
const fixupSvgString = require('../src/fixup-svg-string');

const {window} = new JSDOM();
const domParser = new window.DOMParser();

const parseXml = xmlString => {
    const doc = domParser.parseFromString(xmlString, 'text/xml');
    const errorNode = doc.querySelector('parsererror');
    if (errorNode) {
        throw new Error(errorNode.textContent);
    }
    return doc;
};

test('fixupSvgString should make parsing fixtures not throw', t => {
    const filePath = path.resolve(__dirname, './fixtures/hearts.svg');
    const svgString = fs.readFileSync(filePath)
        .toString();
    const fixed = fixupSvgString(svgString);

    // Make sure undefineds aren't being written into the file
    t.equal(fixed.indexOf('undefined'), -1);
    t.doesNotThrow(() => {
        parseXml(fixed);
    });
    t.end();
});

test('fixupSvgString should correct namespace declarations bound to reserved namespace names', t => {
    const filePath = path.resolve(__dirname, './fixtures/reserved-namespace.svg');
    const svgString = fs.readFileSync(filePath)
        .toString();
    const fixed = fixupSvgString(svgString);

    // Make sure undefineds aren't being written into the file
    t.equal(fixed.indexOf('undefined'), -1);
    t.doesNotThrow(() => {
        parseXml(fixed);
    });
    t.end();
});

test('fixupSvgString shouldn\'t correct non-attributes', t => {
    const dontFix = fixupSvgString('<text>xmlns:test="http://www/w3.org/XML/1998/namespace" is not an xmlns attribute</text>');

    t.not(dontFix.indexOf('http://www/w3.org/XML/1998/namespace'), -1);
    t.end();
});

test('fixupSvgString should strip `svg:` prefix from tag names', t => {
    const filePath = path.resolve(__dirname, './fixtures/svg-tag-prefixes.svg');
    const svgString = fs.readFileSync(filePath)
        .toString();
    const fixed = fixupSvgString(svgString);

    const checkPrefixes = element => {
        t.not(element.prefix, 'svg');
        // JSDOM doesn't have element.children, only element.childNodes
        if (element.childNodes) {
            // JSDOM's childNodes is not iterable, so for...of cannot be used here
            for (let i = 0; i < element.childNodes.length; i++) {
                const child = element.childNodes[i];
                if (child.nodeType === 1 /* Node.ELEMENT_NODE */) checkPrefixes(child);
            }
        }
    };

    // Make sure undefineds aren't being written into the file
    t.equal(fixed.indexOf('undefined'), -1);
    t.doesNotThrow(() => {
        parseXml(fixed);
    });

    checkPrefixes(parseXml(fixed));

    t.end();
});

test('fixupSvgString should empty script tags', t => {
    const filePath = path.resolve(__dirname, './fixtures/script.svg');
    const svgString = fs.readFileSync(filePath)
        .toString();
    const fixed = fixupSvgString(svgString);
    // Script tag should remain but have no contents.
    t.equal(fixed.indexOf('<script></script>'), 207);
    // The contents of the script tag (e.g. the alert) are no longer there.
    t.equal(fixed.indexOf('stuff inside'), -1);
    t.end();
});

test('fixupSvgString should empty script tags in onload', t => {
    const filePath = path.resolve(__dirname, './fixtures/onload-script.svg');
    const svgString = fs.readFileSync(filePath)
        .toString();
    const fixed = fixupSvgString(svgString);
    // Script tag should remain but have no contents.
    t.equal(fixed.indexOf('<script></script>'), 792);
    t.end();
});

test('fixupSvgString strips contents of metadata', t => {
    const filePath = path.resolve(__dirname, './fixtures/metadata-body.svg');
    const svgString = fs.readFileSync(filePath)
        .toString();
    const fixed = fixupSvgString(svgString);
    // Metadata tag should still exist, it'll just be empty.
    t.equal(fixed.indexOf('<metadata></metadata>'), 207);
    // The contents of the metadata tag are gone.
    t.equal(fixed.indexOf('stuff inside'), -1);
    t.end();
});

test('fixupSvgString strips contents of metadata in onload', t => {
    const filePath = path.resolve(__dirname, './fixtures/metadata-onload.svg');
    const svgString = fs.readFileSync(filePath)
        .toString();
    const fixed = fixupSvgString(svgString);
    // Metadata tag should still exist, it'll just be empty.
    t.equal(fixed.indexOf('<metadata></metadata>'), 800);
    t.end();
});

test('fixupSvgString should correct invalid mime type', t => {
    const filePath = path.resolve(__dirname, './fixtures/invalid-cloud.svg');
    const svgString = fs.readFileSync(filePath, 'utf8');
    const fixed = fixupSvgString(svgString);

    // Make sure we replace an invalid mime type from Photoshop exported SVGs
    t.not(svgString.indexOf('img/png'), -1);
    t.equal(fixed.indexOf('img/png'), -1);
    t.doesNotThrow(() => {
        parseXml(fixed);
    });
    t.end();
});

test('fixupSvgString shouldn\'t correct non-image tags', t => {
    const dontFix = fixupSvgString('<text>data:img/png is not a mime type</text>');

    t.not(dontFix.indexOf('img/png'), -1);
    t.end();
});
