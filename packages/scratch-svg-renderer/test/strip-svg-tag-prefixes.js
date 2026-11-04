const test = require('tap').test;
const fs = require('fs');
const path = require('path');
const {JSDOM} = require('jsdom');
const stripSvgTagPrefixes = require('../src/strip-svg-tag-prefixes');

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

test('stripSvgTagPrefixes should strip `svg:` prefix from tag names', t => {
    const filePath = path.resolve(__dirname, './fixtures/svg-tag-prefixes.svg');
    const svgString = fs.readFileSync(filePath)
        .toString();
    const fixed = stripSvgTagPrefixes(svgString);

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

test('stripSvgTagPrefixes should strip other prefixes bound to the SVG namespace', t => {
    const fixed = stripSvgTagPrefixes(
        '<foo:svg xmlns:foo="http://www.w3.org/2000/svg" xmlns:a.b=\'http://www.w3.org/2000/svg\'>' +
        '<foo:g><a.b:rect/></foo:g>' +
        '</foo:svg>'
    );
    t.equal(fixed,
        '<svg xmlns:foo="http://www.w3.org/2000/svg" xmlns:a.b=\'http://www.w3.org/2000/svg\'>' +
        '<g><rect/></g>' +
        '</svg>');
    t.end();
});

test('stripSvgTagPrefixes shouldn\'t strip prefixes bound to other namespaces', t => {
    const svgString =
        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:foo="http://example.com/ns" ' +
        'xmlns:bar="https://www.w3.org/2000/svg" xmlns:aXb="http://example.com/ns">' +
        '<foo:rect/><bar:rect/><aXb:rect/><undeclared:rect/>' +
        '</svg>';
    t.equal(stripSvgTagPrefixes(svgString), svgString);
    t.end();
});
