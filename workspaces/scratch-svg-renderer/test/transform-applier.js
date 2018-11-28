// Test transform-applier

const test = require('tap').test;
const jsdom = require('jsdom');
const {JSDOM} = jsdom;
const transformStrokeWidths = require('../src/transform-applier');

//const d = 'M58.766,33.926c1.854,0,4.555-0.284,4.697,0.569c0.143,0.855-1.709,4.203-2.988,4.345&#13;&#10;&#9;c-1.283,0.142-6.125-2.353-6.195-3.919C54.206,33.355,57.055,33.926,58.766,33.926z';
const d = 'M -20 -20 0 10 L 5 5 H 10 V 10 C 10 10 20 10 15 25 S 15 30 15 40 ' +
    'Q 20 50 30 60 T 30 70 20 80 A 30 90 0 0 1 0 100 Z ';

// No transform attribute on the path
test('noTransformPath', t => {
    const {window} = new JSDOM();
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="100px" height="100px" viewBox="0 0 100 100">` +
            `<path id="path" fill="#5E4A42" stroke="#000000" d="${d}"/>` +
        `</svg>`;
    const parser = new window.DOMParser();
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;

    t.equals(d, svgElement.getElementById('path').attributes.d.value);
    transformStrokeWidths(svgElement);
    t.equals(d, svgElement.getElementById('path').attributes.d.value);
    t.end();
});

// Transform is identity matrix
test('identityTransformPath', t => {
    const {window} = new JSDOM();
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="100px" height="100px" viewBox="0 0 100 100">` +
            `<path transform="matrix(1 0 0 1 0 0)" id="path" fill="#5E4A42" stroke="#000000" d="${d}"/>` +
        `</svg>`;
    const parser = new window.DOMParser();
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;

    t.equals(d, svgElement.getElementById('path').attributes.d.value);
    transformStrokeWidths(svgElement);
    t.equals(d, svgElement.getElementById('path').attributes.d.value);
    t.end();
});

// Transform is not identity matrix
test('identityTransformPath', t => {
    const {window} = new JSDOM();
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="100px" height="100px" viewBox="0 0 100 100">` +
            `<path transform="matrix(2 0 0 2 0 0)" id="path" fill="#5E4A42" stroke="#000000" d="${d}"/>` +
        `</svg>`;
    const parser = new window.DOMParser();
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;

    t.equals(d, svgElement.getElementById('path').attributes.d.value);
    transformStrokeWidths(svgElement);
    t.equals(d, svgElement.getElementById('path').attributes.d.value);
    // TODO test get correct transform
    t.end();
});

// Transform has multiple matrices
test('composedTransformPath', t => {
    const {window} = new JSDOM();
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="100px" height="100px" viewBox="0 0 100 100">` +
            `<path transform="matrix(.5,0,0,.5,0,0) matrix(2,0,0,2,0,0)" id="path" fill="#5E4A42" stroke="#000000" d="${d}"/>` +
        `</svg>`;
    const parser = new window.DOMParser();
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;

    transformStrokeWidths(svgElement);
    t.equals(d, svgElement.getElementById('path').attributes.d.value);
    // TODO test get correct transform
    t.end();
});

// Transform is on parent group
test('parentTransformPath', t => {
    const {window} = new JSDOM();
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="100px" height="100px" viewBox="0 0 100 100">` +
            `<g transform="matrix(2, 0, 0, 2, 0, 0)">` +
            `<path id="path" fill="#5E4A42" stroke="#000000" d="${d}"/>` +
            `</g>` +
        `</svg>`;
    const parser = new window.DOMParser();
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;

    transformStrokeWidths(svgElement);
    t.equals(d, svgElement.getElementById('path').attributes.d.value);
    // TODO test get correct transform
    t.end();
});

// Nested path
test('nestedNoTransformPath', t => {
    const {window} = new JSDOM();
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="100px" height="100px" viewBox="0 0 100 100">` +
            `<g>` +
            `<path id="path" fill="#5E4A42" stroke="#000000" d="${d}"/>` +
            `</g>` +
        `</svg>`;
    const parser = new window.DOMParser();
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;

    t.equals(d, svgElement.getElementById('path').attributes.d.value);
    transformStrokeWidths(svgElement);
    t.equals(d, svgElement.getElementById('path').attributes.d.value);
    t.end();
});

// Transforms on parents and children
test('nestedTransformPath', t => {
    const {window} = new JSDOM();
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="100px" height="100px" viewBox="0 0 100 100">` +
            `<g transform=" matrix(0.5 0 0 0.5 0 0) ">` +
            `<g>` +
            `<path transform="matrix(.5,0,0,.5,0,0)" id="path" fill="#5E4A42" stroke="#000000" d="${d}"/>` +
            `</g>` +
            `</g>` +
        `</svg>`;
    const parser = new window.DOMParser();
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;

    transformStrokeWidths(svgElement);
    t.equals(d, svgElement.getElementById('path').attributes.d.value);
    // TODO test get correct transform
    t.end();
});

// Transform has all types of transforms
test('variousTransformsPath', t => {
    const {window} = new JSDOM();
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="100px" height="100px" viewBox="0 0 100 100">` +
            `<path transform="rotate(25) matrix(.5,0,0,.5,0,0) skewX(10) ` +
                `translate(20) rotate(25, 100, 100) skewY(-10) translate(-10, 4) scale(.5,0.2)" ` +
                `id="path" fill="#5E4A42" stroke="#000000" d="${d}"/>` +
        `</svg>`;
    const parser = new window.DOMParser();
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;

    transformStrokeWidths(svgElement);
    t.equals(d, svgElement.getElementById('path').attributes.d.value);
    // TODO test get correct transform
    t.end();
});

// Transform is pushed down to other children
test('siblingsTransformPath', t => {
    const {window} = new JSDOM();
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="100px" height="100px" viewBox="0 0 100 100">` +
            `<g transform="matrix(0.5 0 0 0.5 0 0)">` +
                `<g transform="translate(10, 20)">` +
                    `<path transform="matrix(.5 0 0 .5 0 0)" id="path" fill="#5E4A42" stroke="#000000" d="${d}"/>` +
                    `<shape id="sibling"/>` +
                `</g>` +
                `<shape id="distantCousin1" transform="translate(-0.5,-.5)" />` +
                `<shape id="distantCousin2" />` +
            `</g>` +
        `</svg>`;
    const parser = new window.DOMParser();
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;

    transformStrokeWidths(svgElement);
    // TODO check siblings get correct transform
    t.end();
});

// Stroke width is pushed down
test('siblingsStroke', t => {
    const {window} = new JSDOM();
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="100px" height="100px" viewBox="0 0 100 100">` +
            `<g stroke-width="5">` +
                `<g stroke-width="10">` +
                    `<path transform="matrix(.5 0 0 .5 0 0)" id="path" fill="#5E4A42" stroke="#000000" d="${d}" id="path"/>` +
                    `<shape id="sibling"/>` +
                `</g>` +
                `<shape id="distantCousin1" stroke-width="15" />` +
                `<shape id="distantCousin2" />` +
            `</g>` +
        `</svg>`;
    const parser = new window.DOMParser();
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;

    transformStrokeWidths(svgElement);
    // TODO check siblings get correct stroke width
    t.end();
});
