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

    // Make sure undefineds aren't being written into the file
    t.equal(fixed.indexOf('undefined'), -1);
    t.notThrow(() => {
        domParser.parseFromString(fixed, 'text/xml');
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
    t.notThrow(() => {
        domParser.parseFromString(fixed, 'text/xml');
    });
    t.end();
});

test('fixupSvgString shouldn\'t correct non-attributes', t => {
    const dontFix = fixupSvgString('<text>xmlns:test="http://www/w3.org/XML/1998/namespace" is not an xmlns attribute</text>');

    t.notEqual(dontFix.indexOf('http://www/w3.org/XML/1998/namespace'), -1);
    t.end();
});

test('fixupSvgString should strip `svg:` prefix from tag names', t => {
    const filePath = path.resolve(__dirname, './fixtures/svg-tag-prefixes.svg');
    const svgString = fs.readFileSync(filePath)
        .toString();
    const fixed = fixupSvgString(svgString);

    const checkPrefixes = element => {
        t.notEqual(element.prefix, 'svg');
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
    t.notThrow(() => {
        domParser.parseFromString(fixed, 'text/xml');
    });

    checkPrefixes(domParser.parseFromString(fixed, 'text/xml'));

    t.end();
});

test('fixupSvgString should empty script tags', t => {
    const filePath = path.resolve(__dirname, './fixtures/script.svg');
    const svgString = fs.readFileSync(filePath)
        .toString();
    const fixed = fixupSvgString(svgString);
    // Script tag should remain but have no contents.
    t.equals(fixed.indexOf('<script></script>'), 207);
    // The contents of the script tag (e.g. the alert) are no longer there.
    t.equals(fixed.indexOf('stuff inside'), -1);
    t.end();
});

test('fixupSvgString should empty script tags in onload', t => {
    const filePath = path.resolve(__dirname, './fixtures/onload-script.svg');
    const svgString = fs.readFileSync(filePath)
        .toString();
    const fixed = fixupSvgString(svgString);
    // Script tag should remain but have no contents.
    t.equals(fixed.indexOf('<script></script>'), 792);
    t.end();
});

test('fixupSvgString strips contents of metadata', t => {
    const filePath = path.resolve(__dirname, './fixtures/metadata-body.svg');
    const svgString = fs.readFileSync(filePath)
        .toString();
    const fixed = fixupSvgString(svgString);
    // Metadata tag should still exist, it'll just be empty.
    t.equals(fixed.indexOf('<metadata></metadata>'), 207);
    // The contents of the metadata tag are gone.
    t.equals(fixed.indexOf('stuff inside'), -1);
    t.end();
});

test('fixupSvgString strips contents of metadata in onload', t => {
    const filePath = path.resolve(__dirname, './fixtures/metadata-onload.svg');
    const svgString = fs.readFileSync(filePath)
        .toString();
    const fixed = fixupSvgString(svgString);
    // Metadata tag should still exist, it'll just be empty.
    t.equals(fixed.indexOf('<metadata></metadata>'), 800);
    t.end();
});

test('fixupSvgString should correct invalid mime type', t => {
    const filePath = path.resolve(__dirname, './fixtures/invalid-cloud.svg');
    const svgString = fs.readFileSync(filePath, 'utf8');
    const fixed = fixupSvgString(svgString);

    // Make sure we replace an invalid mime type from Photoshop exported SVGs
    t.notEqual(svgString.indexOf('img/png'), -1);
    t.equal(fixed.indexOf('img/png'), -1);
    t.notThrow(() => {
        domParser.parseFromString(fixed, 'text/xml');
    });
    t.end();
});

test('fixupSvgString shouldn\'t correct non-image tags', t => {
    const dontFix = fixupSvgString('<text>data:img/png is not a mime type</text>');

    t.notEqual(dontFix.indexOf('img/png'), -1);
    t.end();
});
