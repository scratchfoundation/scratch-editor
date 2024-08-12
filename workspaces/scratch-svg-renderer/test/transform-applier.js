// Test transform-applier

const test = require('tap').test;
const jsdom = require('jsdom');
const {JSDOM} = jsdom;
const transformStrokeWidths = require('../src/transform-applier');
const log = require('../src/util/log');

// PathData, absolute instructions only
const d = 'M -20 -20 0 10 ' +
    'L 5 5 H 10 V 10 ' +
    'C 10 10 20 10 15 25 ' +
    'S 15 30 15 40 ' +
    'Q 20 50 30 60 ' +
    'T 30 70 20 80 ' +
    'M 0 0 ' +
    'A 40 50 0 1 1 0 100 Z ';
// Path constructed specifically for testing elliptical arcs
const ellipticalPath = 'M10,300 l 50,-25  ' +
    'a25,25 -60 0,1 50,-25 l 50,-25  ' +
    'a25,50 -45 0,1 50,-25 l 50,-25  ' +
    'a25,75 -30 0,1 50,-25 l 50,-25  ' +
    'a25,100 -15 0,1 50,-25 l 50,-25 v 50 l -50,25  ' +
    'a25,25 60 1,1 -50,25 l -50,25  ' +
    'a25,50 45 1,1 -50,25 l -50,25  ' +
    'a25,75 30 1,1 -50,25 l -50,25  ' +
    'a25,100 15 1,1 -50,25 l -50,25  ';

// This path is tricky because all of its bounds lie outside
// the 2 given points
const trickyBoundsPath = 'M 40 40 A 30 50 -45 1,1 80 80';
// Because jsdom doesn't simulate SvgElement.getBBox(), we need to store
// the bounds for testing.
const trickyBoundsPathBounds = {
    height: 82.46210479736328,
    width: 82.46211242675781,
    x: 36.26179885864258,
    y: 1.2760814428329468
};

const {window} = new JSDOM();
const parser = new window.DOMParser();
const fs = require('fs');
const OUTPUT_COMPARISON_FILES = false;
let comparisonFileString = '';

const comparisonFileAppend = function (svgString, svgElement, name) {
    if (!OUTPUT_COMPARISON_FILES) return;
    const newSvgString = new window.XMLSerializer().serializeToString(svgElement);
    comparisonFileString +=
        `<p>${name}</p>
        <div style="width: 500px; border-style: solid; border-width: 1px;">
            ${svgString}
        </div>
        <div style="width: 500px; border-style: solid; border-width: 0 1px 1px 1px;">
            ${newSvgString}
        </div>`;
};

const outputComparisonFile = function () {
    if (!OUTPUT_COMPARISON_FILES) return;
    fs.writeFile(
        `${__dirname}/test-output/transform-applier-test.html`,
        `<!-- THIS IS A GENERATED FILE -->\n<html><body>${comparisonFileString}\n</body></html>`,
        err => log.error(err)
    );
};

// No transform attribute on the path
test('noTransformPath', t => {
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="100px" height="100px" viewBox="0 0 100 100">` +
            `<path id="path" fill="#0000" stroke="red" stroke-width="1" d="${d}"/>` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement, window);
    comparisonFileAppend(svgString, svgElement, 'noTransformPath');

    t.equals(d, svgElement.getElementById('path').attributes.d.value);
    t.false(svgElement.getElementById('path').attributes.transform);
    t.end();
});

// No stroke width attribute on the path. Stroke width is 1 by default in SVG, so transform should increase it to 2.
test('transformedNoStrokeWidthPath', t => {
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="100px" height="100px" viewBox="0 0 100 100">` +
            `<path id="path" transform="scale(2)" fill="#0000" stroke="red" d="${d}"/>` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement, window);
    comparisonFileAppend(svgString, svgElement, 'noStrokeWidthPath');

    t.equals('2', svgElement.getElementById('path').attributes['stroke-width'].value);
    t.end();
});

// Transform is identity matrix
test('identityTransformPath', t => {
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="100px" height="100px" viewBox="0 0 100 100">` +
            `<path transform="matrix(1 0 0 1 0 0)" id="path" fill="#0000" stroke="red" stroke-width="1" d="${d}"/>` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement, window);
    comparisonFileAppend(svgString, svgElement, 'identityTransformPath');

    t.equals(d, svgElement.getElementById('path').attributes.d.value);
    t.false(svgElement.getElementById('path').attributes.transform);
    t.end();
});

// Transform on a simple box
test('transformBox', t => {
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="250px" height="250px" viewBox="0 0 250 250">` +
            `<path transform="matrix(20 0 0 10 45 45)" id="path" fill="#0000" stroke="red" stroke-width="1" ` +
                `d="M0,0 h 10 v 10 h -10 z"/>` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement, window);
    comparisonFileAppend(svgString, svgElement, 'transformBox');

    const transformed = `M 45 45 L 245 45 L 245 145 L 45 145 Z `;
    t.equals(transformed, svgElement.getElementById('path').attributes.d.value);
    // Transform is integrated into path, so the attribute should be gone
    t.false(svgElement.getElementById('path').attributes.transform);
    const quadraticMean = Math.sqrt(((20 * 20) + (10 * 10)) / 2);
    t.equals(`${quadraticMean}`, svgElement.getElementById('path').attributes['stroke-width'].value);
    t.end();
});

// Transform is not identity matrix
test('transformPath', t => {
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="250px" height="250px" viewBox="0 0 250 250">` +
            `<path transform="matrix(2 0 0 2 45 45)" id="path" fill="#0000" stroke="red" stroke-width="1" d="${d}"/>` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement, window);
    comparisonFileAppend(svgString, svgElement, 'transformPath');

    const doubled = 'M 5 5 L 45 65 L 55 55 L 65 55 L 65 65 C 65 65 85 65 75 95 C 65 125 75 105 75 125 ' +
    'Q 85 145 105 165 Q 125 185 105 185 Q 85 185 85 205 M 45 45 A 80 100 0 1 1 45 245 Z ';
    t.equals(doubled, svgElement.getElementById('path').attributes.d.value);
    // Transform is integrated into path, so the attribute should be gone
    t.false(svgElement.getElementById('path').attributes.transform);
    t.equals('2', svgElement.getElementById('path').attributes['stroke-width'].value);
    t.end();
});

// Transform has multiple matrices that compose to identity matrix
test('composedTransformPathIdentity', t => {
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="100px" height="100px" viewBox="0 0 100 100">` +
            `<path transform="matrix(.5,0,0,.5,0,0) matrix(2,0,0,2,0,0)" id="path" ` +
            `fill="#0000" stroke="red" stroke-width="1" d="${d}"/>` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement, window);
    comparisonFileAppend(svgString, svgElement, 'composedTransformPathIdentity');

    t.equals(d, svgElement.getElementById('path').attributes.d.value);
    t.false(svgElement.getElementById('path').attributes.transform);
    t.end();
});

// Transform has multiple matrices that don't compose to identity
test('composedTransformPath', t => {
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="230px" height="230px" viewBox="-30 -30 200 200">` +
            `<path transform="matrix(.5,0,0,.5,0,0) matrix(3,0,0,3,1,2)" id="path" ` +
                `fill="#0000" stroke="red" stroke-width="1" d="${d}"/>` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement, window);
    comparisonFileAppend(svgString, svgElement, 'composedTransformPath');

    const transformedPath = 'M -29.5 -29 L 0.5 16 L 8 8.5 L 15.5 8.5 L 15.5 16 C 15.5 16 30.5 16 23 38.5 ' +
    'C 15.5 61 23 46 23 61 Q 30.5 76 45.5 91 Q 60.5 106 45.5 106 Q 30.5 106 30.5 121 M 0.5 1 ' +
    'A 60 75 0 1 1 0.5 151 Z ';
    t.equals(transformedPath, svgElement.getElementById('path').attributes.d.value);
    t.end();
});

// Transform is on parent group
test('parentTransformPath', t => {
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="300px" height="300px" viewBox="-50 -50 250 250">` +
            `<g id="group" transform="matrix(2, 0, 0, 2, 0, 0)">` +
            `<path id="path" fill="#0000" stroke="red" stroke-width="1" d="${d}"/>` +
            `</g>` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement, window);
    comparisonFileAppend(svgString, svgElement, 'parentTransformPath');

    const doubled = 'M -40 -40 L 0 20 L 10 10 L 20 10 L 20 20 C 20 20 40 20 30 50 C 20 80 30 60 30 80 ' +
    'Q 40 100 60 120 Q 80 140 60 140 Q 40 140 40 160 M 0 0 A 80 100 0 1 1 0 200 Z ';
    t.equals(doubled, svgElement.getElementById('path').attributes.d.value);
    // Transform should be gone from both child and parent
    t.false(svgElement.getElementById('group').attributes.transform);
    t.false(svgElement.getElementById('path').attributes.transform);
    t.equals('2', svgElement.getElementById('path').attributes['stroke-width'].value);
    t.end();
});

// Nested path
test('nestedNoTransformPath', t => {
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="100px" height="100px" viewBox="0 0 100 100">` +
            `<g>` +
                `<path id="path" fill="#0000" stroke="red" stroke-width="1" d="${d}"/>` +
            `</g>` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement, window);
    comparisonFileAppend(svgString, svgElement, 'nestedNoTransformPath');

    t.equals(d, svgElement.getElementById('path').attributes.d.value);
    t.end();
});

// Transforms on parents and children
test('nestedTransformPath', t => {
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="300px" height="300px" viewBox="-40 -40 260 260">` +
            `<g transform=" matrix(1.5 0 0 1.5 0 0) ">` +
                `<g>` +
                    `<path transform="matrix(1.5,0,0,1.5,0,0)" id="path" fill="#0000" stroke="red" stroke-width="1" ` +
                        `d="${d}"/>` +
                `</g>` +
            `</g>` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement, window);
    comparisonFileAppend(svgString, svgElement, 'nestedTransformPath');

    const quartered = 'M -45 -45 L 0 22.5 L 11.25 11.25 L 22.5 11.25 L 22.5 22.5 C 22.5 22.5 45 22.5 33.75 56.25 ' +
    'C 22.5 90 33.75 67.5 33.75 90 Q 45 112.5 67.5 135 Q 90 157.5 67.5 157.5 Q 45 157.5 45 180 M 0 0 ' +
    'A 90 112.5 0 1 1 0 225 Z ';
    t.equals(quartered, svgElement.getElementById('path').attributes.d.value);
    t.end();
});

// Transform combines all types of transforms
test('variousTransformsPath', t => {
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="500px" height="400px" viewBox="0 0 500 400">` +
            `<path transform="rotate(25) matrix(2,0,0,2,0,0) skewX(10) translate(20) ` +
                `rotate(25, 100, 100) skewY(-10) translate(-10, 4) scale(1.5,0.8) translate(40,80) " ` +
                `id="path" fill="#0000" stroke="red" stroke-width="1" d="${d}"/>` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement, window);
    comparisonFileAppend(svgString, svgElement, 'variousTransformsPath');

    const transformedPath = 'M 115.3172 96.7866 L 134.6908 171.2195 L 151.9584 175.6212 L 164.2563 185.7055 ' +
    'L 159.2866 191.3881 C 159.2866 191.3881 183.8824 211.5567 156.6755 218.5202 ' +
    'C 129.4685 225.4837 151.7058 224.2028 141.7664 235.568 Q 144.1249 257.0175 158.7814 288.5514 ' +
    'Q 173.4379 320.0852 148.842 299.9166 Q 124.2462 279.7479 114.3068 291.1131 M 144.6301 159.8543 ' +
    'A 75.4328 127.2656 -51.6345 1 1 45.2364 273.5062 Z ';
    t.equals(transformedPath, svgElement.getElementById('path').attributes.d.value);
    t.false(svgElement.getElementById('path').attributes.transform);
    t.end();
});

// Transform is pushed down to other children
test('siblingsTransformPath', t => {
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="160px" height="160px" viewBox="-20 -20 140 140">` +
            `<g transform="matrix(0.5 0 0 0.5 0 0)">` +
                `<g transform="translate(10, 20)">` +
                    `<path transform="matrix(2 0 0 2 0 0)" id="path" fill="#0000" stroke="red" stroke-width="1" ` +
                        `d="${d}"/>` +
                    `<rect id="sibling" x="40" y="40" width="40" height="40" fill="#0000" stroke="blue" />` +
                `</g>` +
                `<rect id="distantCousin1" transform="translate(-0.5,-.5)" ` +
                    `x="40" y="40" width="40" height="40" fill="#0000" stroke="blue" />` +
                `<rect id="distantCousin2" x="40" y="40" width="40" height="40" fill="#0000" stroke="blue" />` +
            `</g>` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement, window);
    comparisonFileAppend(svgString, svgElement, 'siblingsTransformPath');

    t.equals('matrix(0.5,0,0,0.5,5,10)', svgElement.getElementById('sibling').attributes.transform.value);
    t.equals('matrix(0.5,0,0,0.5,-0.25,-0.25)', svgElement.getElementById('distantCousin1').attributes.transform.value);
    t.equals('matrix(0.5,0,0,0.5,0,0)', svgElement.getElementById('distantCousin2').attributes.transform.value);
    t.end();
});

// Stroke width is pushed down to leaf level
test('siblingsStroke', t => {
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="120px" height="120px" viewBox="-20 -20 100 100">` +
            `<g stroke-width="5">` +
                `<g stroke-width="10">` +
                    `<path transform="matrix(.5 0 0 .5 0 0)" fill="#0000" stroke="red" stroke-width="1" ` +
                        `d="${d}" id="path"/>` +
                    `<rect id="sibling" x="10" y="10" width="40" height="40" fill="#0000" stroke="blue" />` +
                `</g>` +
                `<rect id="distantCousin1" stroke-width="15" x="25" y="25" width="40" height="40" fill="#0000" ` +
                    `stroke="blue" />` +
                `<rect id="distantCousin2" x="40" y="40" width="40" height="40" fill="#0000" stroke="blue" />` +
            `</g>` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement, window);
    comparisonFileAppend(svgString, svgElement, 'siblingsStroke');

    t.equals('10', svgElement.getElementById('sibling').attributes['stroke-width'].value);
    t.equals('15', svgElement.getElementById('distantCousin1').attributes['stroke-width'].value);
    t.equals('5', svgElement.getElementById('distantCousin2').attributes['stroke-width'].value);
    t.end();
});

// Nested stroke width is transformed
test('transformedNestedStroke', t => {
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="650px" height="170px" viewBox="-100 -20 550 150">` +
            `<g stroke-width="1" transform="scale(-.5,.5)">` +
                `<path transform="matrix(5 0 0 2 0 0)" fill="#0000" stroke="red" d="${d}" id="path"/>` +
            `</g>` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement, window);
    comparisonFileAppend(svgString, svgElement, 'transformedNestedStroke');

    const quadraticMean = Math.sqrt(((5 / 2 * 5 / 2) + (2 / 2 * 2 / 2)) / 2);
    t.equals(`${quadraticMean}`, svgElement.getElementById('path').attributes['stroke-width'].value);
    t.end();
});

// Various transforms applied to a path with relative instructions
test('variousTransformsRelativePath', t => {
    const pathData = 'm 20 20 0 20 10 0 l 5 5 h 10 v 10 c 0 10 0 20 15 5 z ' +
        'm -50 5 s 15 0 15 10 q 20 10 10 20 t 20 10 20 10 a 30 10 30 1 1 0 1 ';
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="200px" height="150px" viewBox="0 0 200 150">` +
            `<path transform="skewX(10) rotate(-25) translate(5 20)" ` +
                `id="path" fill="#0000" stroke="red" stroke-width="5" d="${pathData}" />` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement, window);
    comparisonFileAppend(svgString, svgElement, 'variousTransformsRelativePath');

    const transformed = 'M 44.0917 25.6869 L 55.7402 43.813 L 64.0581 39.5868 L 71.1292 42.0053 L 79.447 37.7791 ' +
    'L 85.2713 46.8422 C 91.0955 55.9052 96.9198 64.9683 100.6603 45.0344 Z M 5.4144 51.3493 ' +
    'C 5.4144 51.3493 17.8912 45.01 23.7155 54.0731 Q 46.1755 54.6838 43.6819 67.9731 ' +
    'Q 41.1882 81.2623 66.1419 68.5838 Q 91.0955 55.9052 88.6019 69.1945 ' +
    'A 9.8314 30.5145 -83.9007 1 1 89.1843 70.1008 ';
    t.equals(transformed, svgElement.getElementById('path').attributes.d.value);
    t.end();
});

// Testing scale transform, elliptical paths
test('scaleTransformEllipticalPath', t => {
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="600px" height="250px" viewBox="0 0 600 250"> ` +
            `<path transform="scale(.5)" ` +
                `id="path" fill="#0000" stroke="red" stroke-width="5" d="${ellipticalPath}"/>` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement, window);
    comparisonFileAppend(svgString, svgElement, 'scaleTransformEllipticalPath');

    const scaled = 'M 5 150 L 30 137.5 A 12.5 12.5 -50.7685 0 1 55 125 L 80 112.5 A 12.5 25 -45 0 1 105 100 ' +
    'L 130 87.5 A 12.5 37.5 -30 0 1 155 75 L 180 62.5 A 12.5 50 -15 0 1 205 50 L 230 37.5 L 230 62.5 L 205 75 ' +
    'A 12.5 12.5 -50.7685 1 1 180 87.5 L 155 100 A 12.5 25 45 1 1 130 112.5 L 105 125 A 12.5 37.5 30 1 1 80 137.5 ' +
    'L 55 150 A 12.5 50 15 1 1 30 162.5 L 5 175 ';
    t.equals(scaled, svgElement.getElementById('path').attributes.d.value);
    t.end();
});

// Testing invert transform, elliptical paths
test('invertTransformEllipticalPath', t => {
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="600px" height="500px" viewBox="0 0 600 500"> ` +
            `<path transform="matrix(0 1 1 0 0 0)" ` +
                `id="path" fill="#0000" stroke="red" stroke-width="5" d="${ellipticalPath}"/>` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement, window);
    comparisonFileAppend(svgString, svgElement, 'invertTransformEllipticalPath');

    const inverted = 'M 300 10 L 275 60 A 25 25 -50.7685 0 0 250 110 L 225 160 A 25 50 -45 0 0 200 210 ' +
    'L 175 260 A 25 75 -60 0 0 150 310 L 125 360 A 25 100 -75 0 0 100 410 L 75 460 L 125 460 L 150 410 ' +
    'A 25 25 -50.7685 1 0 175 360 L 200 310 A 25 50 45 1 0 225 260 L 250 210 A 25 75 60 1 0 275 160 L 300 110 ' +
    'A 25 100 75 1 0 325 60 L 350 10 ';
    t.equals(inverted, svgElement.getElementById('path').attributes.d.value);
    t.end();
});

// Testing rotate transform, elliptical paths
test('rotateTransformEllipticalPath', t => {
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="600px" height="600px" viewBox="0 0 600 600"> ` +
            `<path transform="rotate(-255) translate(0,-500)" ` +
                `id="path" fill="#0000" stroke="red" stroke-width="5" d="${ellipticalPath}"/>` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement, window);
    comparisonFileAppend(svgString, svgElement, 'rotateTransformEllipticalPath');

    const rotated = 'M 190.597 61.4231 L 201.8042 116.1898 A 25 25 -50.7685 0 1 213.0114 170.9566 ' +
    'L 224.2186 225.7234 A 25 50 60 0 1 235.4257 280.4901 L 246.6329 335.2569 A 25 75 75 0 1 257.8401 390.0237 ' +
    'L 269.0473 444.7904 A 25 100 90 0 1 280.2545 499.5572 L 291.4617 554.324 L 243.1654 541.383 ' +
    'L 231.9582 486.6163 A 25 25 -50.7685 1 1 220.751 431.8495 L 209.5438 377.0827 ' +
    'A 25 50 -30 1 1 198.3367 322.316 L 187.1295 267.5492 A 25 75 -45 1 1 175.9223 212.7824 L 164.7151 158.0156 ' +
    'A 25 100 -60 1 1 153.5079 103.2489 L 142.3007 48.4821 ';
    t.equals(rotated, svgElement.getElementById('path').attributes.d.value);
    t.end();
});

// Testing skewX transform, elliptical paths
test('skewXTransformEllipticalPath', t => {
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="600px" height="350px" viewBox="0 0 600 350"> ` +
            `<path transform="skewX(-20)" ` +
                `id="path" fill="#0000" stroke="red" stroke-width="5" d="${ellipticalPath}"/>` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement, window);
    comparisonFileAppend(svgString, svgElement, 'skewXTransformEllipticalPath');

    const skewed = 'M -99.1911 300 L -40.0918 275 A 20.861 29.9602 50.1571 0 1 19.0074 250 L 78.1067 225 ' +
    'A 29.7657 41.9946 -28.5971 0 1 137.206 200 L 196.3052 175 A 28.0557 66.8312 -9.069 0 1 255.4045 150 ' +
    'L 314.5037 125 A 25.6458 97.482 6.9831 0 1 373.603 100 L 432.7022 75 L 414.5037 125 L 355.4045 150 ' +
    'A 20.861 29.9602 50.1571 1 1 296.3052 175 L 237.206 200 A 20.8982 59.8139 53.2248 1 1 178.1067 225 ' +
    'L 119.0074 250 A 21.0102 89.2423 43.6881 1 1 59.9082 275 L 0.8089 300 ' +
    'A 21.8464 114.4351 32.9028 1 1 -58.2903 325 L -117.3896 350 ';
    t.equals(skewed, svgElement.getElementById('path').attributes.d.value);
    t.end();
});

// Testing skewY transform, elliptical paths
test('skewYTransformEllipticalPath', t => {
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="600px" height="400px" viewBox="0 0 600 400"> ` +
            `<path transform="skewY(-20)" ` +
                `id="path" fill="#0000" stroke="red" stroke-width="5" d="${ellipticalPath}"/>` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement, window);
    comparisonFileAppend(svgString, svgElement, 'skewYTransformEllipticalPath');

    const skewed = 'M 10 296.3603 L 60 253.1618 A 20.861 29.9602 39.8429 0 1 110 209.9633 L 160 166.7648 ' +
    'A 29.7657 41.9946 -61.4029 0 1 210 123.5663 L 260 80.3677 A 29.4429 63.6825 -34.2139 0 1 310 37.1692 ' +
    'L 360 -6.0293 A 27.3833 91.2964 -14.925 0 1 410 -49.2278 L 460 -92.4263 L 460 -42.4263 L 410 0.7722 ' +
    'A 20.861 29.9602 39.8429 1 1 360 43.9707 L 310 87.1692 A 20.8982 59.8139 36.7752 1 1 260 130.3677 ' +
    'L 210 173.5663 A 21.4899 87.2503 26.3947 1 1 160 216.7648 L 110 259.9633 ' +
    'A 22.8454 109.4312 14.6345 1 1 60 303.1618 L 10 346.3603 ';
    t.equals(skewed, svgElement.getElementById('path').attributes.d.value);
    t.end();
});

// Testing various transforms, elliptical paths
test('variousTransformsEllipticalPath', t => {
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="600px" height="600px" viewBox="0 -200 600 300"> ` +
            `<path transform="skewX(10) rotate(-25) translate(-50 -200)" ` +
                `id="path" fill="#0000" stroke="red" stroke-width="5" d="${ellipticalPath}"/>` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement, window);
    comparisonFileAppend(svgString, svgElement, 'variousTransformsEllipticalPath');

    const transformed = 'M 24.9709 107.5355 L 51.9997 63.7469 A 22.8929 27.3011 -47.5192 0 1 79.0286 19.9583 ' +
    'L 106.0574 -23.8303 A 23.5927 52.9826 -69.05 0 1 133.0862 -67.6189 L 160.115 -111.4075 ' +
    'A 23.0486 81.3499 -57.6917 0 1 187.1438 -155.1961 L 214.1727 -198.9847 ' +
    'A 22.8991 109.1745 -45.4789 0 1 241.2015 -242.7734 L 268.2303 -286.562 L 297.3515 -241.2466 ' +
    'L 270.3227 -197.458 A 22.8929 27.3011 -47.5192 1 1 243.2939 -153.6694 L 216.2651 -109.8807 ' +
    'A 26.0319 48.0181 7.1283 1 1 189.2363 -66.0921 L 162.2074 -22.3035 ' +
    'A 24.9487 75.1544 -6.3334 1 1 135.1786 21.4851 L 108.1498 65.2737 ' +
    'A 23.9235 104.4996 -19.9344 1 1 81.121 109.0623 L 54.0922 152.8509 ';
    t.equals(transformed, svgElement.getElementById('path').attributes.d.value);
    t.end();
});

test('linearGradientTransformSquareSkewY', t => {
    const svgString =
    `<svg version="1.1" width="200" height="200" viewBox="-100 0 100 200" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">` +
      `<defs>` +
        `<linearGradient id="grad_a" x2="0" y2="1">` +
          `<stop offset="0" stop-color="green" stop-opacity="1"/>` +
          `<stop offset="1" stop-color="red" stop-opacity="1"/>` +
        `</linearGradient>` +
      `</defs>` +
      `<path id="path" fill="url(#grad_a)" stroke="#000000" stroke-width="2" d="M0,0 0,100 100,100 100,0 z" ` +
          `transform="translate(-50, 50) scale(-.75, 1) skewY(-15)"/>` +
    `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement, window, {width: 100, height: 100, x: 0, y: 0});
    comparisonFileAppend(svgString, svgElement, 'linearGradientTransformSquareSkewY');
    t.equals('-50', svgElement.getElementById('grad_a-0.75,-0.2679491924311227,0,1,-50,50').attributes.x1.value);
    t.equals('-81.6826', svgElement.getElementById('grad_a-0.75,-0.2679491924311227,0,1,-50,50').attributes.x2.value);
    t.equals('50', svgElement.getElementById('grad_a-0.75,-0.2679491924311227,0,1,-50,50').attributes.y1.value);
    t.equals('138.6809', svgElement.getElementById('grad_a-0.75,-0.2679491924311227,0,1,-50,50').attributes.y2.value);

    t.end();
});

test('linearGradientTransformSquareSkewX', t => {
    const svgString =
    `<svg version="1.1" width="200" height="200" viewBox="-100 0 100 200" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">` +
      `<defs>` +
        `<linearGradient id="grad_b" x2="0" y2="1">` +
          `<stop offset="0" stop-color="green" stop-opacity="1"/>` +
          `<stop offset="1" stop-color="red" stop-opacity="1"/>` +
        `</linearGradient>` +
      `</defs>` +
      `<path id="path" fill="url(#grad_b)" stroke="#000000" stroke-width="2" d="M0,0 0,100 100,100 100,0 z" ` +
          `transform="translate(-50, 50) scale(-.75, 1) skewX(-15)"/>` +
    `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement, window, {width: 100, height: 100, x: 0, y: 0});
    comparisonFileAppend(svgString, svgElement, 'linearGradientTransformSquareSkewX');
    t.equals('-50', svgElement.getElementById('grad_b-0.75,0,0.20096189432334202,1,-50,50').attributes.x1.value);
    t.equals('-50', svgElement.getElementById('grad_b-0.75,0,0.20096189432334202,1,-50,50').attributes.x2.value);
    t.equals('50', svgElement.getElementById('grad_b-0.75,0,0.20096189432334202,1,-50,50').attributes.y1.value);
    t.equals('150', svgElement.getElementById('grad_b-0.75,0,0.20096189432334202,1,-50,50').attributes.y2.value);

    t.end();
});

test('linearGradientTransform', t => {
    const svgString =
    `<svg version="1.1" width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">` +
      `<defs>` +
        `<linearGradient id="grad_c">` +
          `<stop offset="0" stop-color="green" stop-opacity="1"/>` +
          `<stop offset="1" stop-color="red" stop-opacity="1"/>` +
        `</linearGradient>` +
      `</defs>` +
      `<path id="path" fill="url(#grad_c)" stroke="#000000" stroke-width="2" d="${trickyBoundsPath}" ` +
          `transform="scale(.75) skewX(-15)"/>` +
    `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement, window, trickyBoundsPathBounds);
    comparisonFileAppend(svgString, svgElement, 'linearGradientTransform');
    t.equals('26.9399', svgElement.getElementById('grad_c-.75,0,-0.20096189432334202,0.75,0,0').attributes.x1.value);
    t.equals('84.6436', svgElement.getElementById('grad_c-.75,0,-0.20096189432334202,0.75,0,0').attributes.x2.value);
    t.equals('0.9571', svgElement.getElementById('grad_c-.75,0,-0.20096189432334202,0.75,0,0').attributes.y1.value);
    t.equals('16.4187', svgElement.getElementById('grad_c-.75,0,-0.20096189432334202,0.75,0,0').attributes.y2.value);

    t.end();
});

test('reusedLinearGradientTransform', t => {
    const svgString =
    `<svg version="1.1" width="200" height="150" viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">` +
      `<defs>` +
        `<linearGradient id="grad_1">` +
          `<stop offset="0" stop-color="green" stop-opacity="1"/>` +
          `<stop offset="1" stop-color="red" stop-opacity="1"/>` +
        `</linearGradient>` +
      `</defs>` +
      `<path id="path" fill="url(#grad_1)" stroke="#000000" stroke-width="2" d="${trickyBoundsPath}" ` +
          `transform="scale(.75) skewX(-15)"/>` +
      `<path id="path2" fill="url(#grad_1)" stroke="#000000" stroke-width="2" d="${trickyBoundsPath}" ` +
          `transform="translate(150, 150) rotate(180)"/>` +
      `<path id="path3" fill="url(#grad_1)" stroke="#000000" stroke-width="2" d="${trickyBoundsPath}" ` +
          `transform="translate(150, 150) rotate(180)"/>` +
    `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement, window, trickyBoundsPathBounds);
    comparisonFileAppend(svgString, svgElement, 'reusedLinearGradientTransform');
    t.equals('26.9399', svgElement.getElementById('grad_1-.75,0,-0.20096189432334202,0.75,0,0').attributes.x1.value);
    t.equals('84.6436', svgElement.getElementById('grad_1-.75,0,-0.20096189432334202,0.75,0,0').attributes.x2.value);
    t.equals('0.9571', svgElement.getElementById('grad_1-.75,0,-0.20096189432334202,0.75,0,0').attributes.y1.value);
    t.equals('16.4187', svgElement.getElementById('grad_1-.75,0,-0.20096189432334202,0.75,0,0').attributes.y2.value);
    t.equals('113.7382', svgElement.getElementById('grad_1-1,1.2246467991473532e-16,-1.2246467991473532e-16,-1,150,150')
        .attributes.x1.value);
    t.equals('31.2761', svgElement.getElementById('grad_1-1,1.2246467991473532e-16,-1.2246467991473532e-16,-1,150,150')
        .attributes.x2.value);
    t.equals('148.7239', svgElement.getElementById('grad_1-1,1.2246467991473532e-16,-1.2246467991473532e-16,-1,150,150')
        .attributes.y1.value);
    t.equals('148.7239', svgElement.getElementById('grad_1-1,1.2246467991473532e-16,-1.2246467991473532e-16,-1,150,150')
        .attributes.y2.value);

    t.end();
});

test('nestedLinearGradientTransform', t => {
    const svgString =
    `<svg version="1.1" width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <linearGradient id="grad_2" x2="0" y2="1">
          <stop offset="0" stop-color="#7F00FF" stop-opacity="1"/>
          <stop offset="1" stop-color="#FF9400" stop-opacity="1"/>
        </linearGradient>
      </defs>
      <g transform="scale(.75) skewX(-15)">
        <path id="path" fill="url(#grad_2)" stroke="#003FFF" stroke-width="5" d="${trickyBoundsPath}" />
      </g>
    </svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement, window, trickyBoundsPathBounds);
    comparisonFileAppend(svgString, svgElement, 'nestedLinearGradientTransform');
    t.equals('26.9399', svgElement.getElementById('grad_2-.75,0,-0.20096189432334202,0.75,0,0').attributes.x1.value);
    t.equals('26.9399', svgElement.getElementById('grad_2-.75,0,-0.20096189432334202,0.75,0,0').attributes.x2.value);
    t.equals('0.9571', svgElement.getElementById('grad_2-.75,0,-0.20096189432334202,0.75,0,0').attributes.y1.value);
    t.equals('62.8036', svgElement.getElementById('grad_2-.75,0,-0.20096189432334202,0.75,0,0').attributes.y2.value);

    t.end();
});

test('percentLinearGradientTransform', t => {
    const svgString =
    `<svg version="1.1" width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <linearGradient id="grad_3" x2="50%" y2="50%">
          <stop offset="0" stop-color="#7F00FF" stop-opacity="1"/>
          <stop offset="1" stop-color="#FF9400" stop-opacity="1"/>
        </linearGradient>
      </defs>
      <path id="path" fill="url(#grad_3)" stroke="#003FFF" stroke-width="5" d="${trickyBoundsPath}"
          transform="scale(.75) skewX(-15)" />
    </svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement, window, trickyBoundsPathBounds);
    comparisonFileAppend(svgString, svgElement, 'percentLinearGradientTransform');
    t.equals('26.9399', svgElement.getElementById('grad_3-.75,0,-0.20096189432334202,0.75,0,0').attributes.x1.value);
    t.equals('50.6569', svgElement.getElementById('grad_3-.75,0,-0.20096189432334202,0.75,0,0').attributes.x2.value);
    t.equals('0.9571', svgElement.getElementById('grad_3-.75,0,-0.20096189432334202,0.75,0,0').attributes.y1.value);
    t.equals('31.029', svgElement.getElementById('grad_3-.75,0,-0.20096189432334202,0.75,0,0').attributes.y2.value);

    t.end();
});

test('userSpaceLinearGradientTransform', t => {
    const svgString =
    `<svg version="1.1" width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <linearGradient id="grad_4" x1="20" x2="80" y1="20" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#7F00FF" stop-opacity="1"/>
          <stop offset="1" stop-color="#FF9400" stop-opacity="1"/>
        </linearGradient>
      </defs>
      <path id="path" fill="url(#grad_4)" stroke="#003FFF" stroke-width="5" d="${trickyBoundsPath}"
          transform="scale(.75) skewX(-15)" />
    </svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement, window, trickyBoundsPathBounds);
    comparisonFileAppend(svgString, svgElement, 'userSpaceLinearGradientTransform');
    t.equals('10.9808', svgElement.getElementById('grad_4-.75,0,-0.20096189432334202,0.75,0,0').attributes.x1.value);
    t.equals('45.494', svgElement.getElementById('grad_4-.75,0,-0.20096189432334202,0.75,0,0').attributes.x2.value);
    t.equals('15', svgElement.getElementById('grad_4-.75,0,-0.20096189432334202,0.75,0,0').attributes.y1.value);
    t.equals('58.761', svgElement.getElementById('grad_4-.75,0,-0.20096189432334202,0.75,0,0').attributes.y2.value);

    t.end();
});

test('degenerateLinearGradientTransform', t => {
    const svgString =
    `<svg version="1.1" width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">` +
      `<defs>` +
        `<linearGradient id="grad_d" x1="50%" x2="50%" y1="50%" y2="50%">` +
          `<stop offset="0" stop-color="green" stop-opacity="1"/>` +
          `<stop offset="1" stop-color="red" stop-opacity="1"/>` +
        `</linearGradient>` +
      `</defs>` +
      `<path id="path" fill="url(#grad_d)" stroke="#000000" stroke-width="2" d="${trickyBoundsPath}" ` +
          `transform="scale(.75) skewX(-15)"/>` +
    `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement, window, trickyBoundsPathBounds);
    comparisonFileAppend(svgString, svgElement, 'linearGradientTransform');

    t.end();
});

test('nestedRadialGradientTransform', t => {
    const svgString =
    `<svg version="1.1" width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <radialGradient id="grad_5">
          <stop offset="0" stop-color="#7F00FF" stop-opacity="1"/>
          <stop offset="1" stop-color="#FF9400" stop-opacity="1"/>
        </radialGradient>
      </defs>
      <g transform="scale(.75) skewX(-15)">
        <path id="path" fill="url(#grad_5)" stroke="#003FFF" stroke-width="5" d="${trickyBoundsPath}" />
      </g>
    </svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement, window, trickyBoundsPathBounds);
    comparisonFileAppend(svgString, svgElement,
        'nestedRadialGradientTransform. Note that radial gradients are not expected to match exactly.');
    t.equals('49.5773', svgElement.getElementById('grad_5-.75,0,-0.20096189432334202,0.75,0,0').attributes.cx.value);
    t.equals('31.8804', svgElement.getElementById('grad_5-.75,0,-0.20096189432334202,0.75,0,0').attributes.cy.value);
    t.equals('30.9233', svgElement.getElementById('grad_5-.75,0,-0.20096189432334202,0.75,0,0').attributes.r.value);

    t.end();
});

test('focalRadialGradientTransform', t => {
    const svgString =
    `<svg version="1.1" width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <radialGradient id="grad_6" fx=".75" fy=".75">
          <stop offset="0" stop-color="#7F00FF" stop-opacity="1"/>
          <stop offset="1" stop-color="#FF9400" stop-opacity="1"/>
        </radialGradient>
      </defs>
      <g transform="scale(.75) skewX(-15)">
        <path id="path" fill="url(#grad_6)" stroke="#003FFF" stroke-width="5" d="${trickyBoundsPath}" />
      </g>
    </svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement, window, trickyBoundsPathBounds);
    comparisonFileAppend(svgString, svgElement, 'focalRadialGradientTransform');
    t.equals('49.5773', svgElement.getElementById('grad_6-.75,0,-0.20096189432334202,0.75,0,0').attributes.cx.value);
    t.equals('31.8804', svgElement.getElementById('grad_6-.75,0,-0.20096189432334202,0.75,0,0').attributes.cy.value);
    t.equals('30.9233', svgElement.getElementById('grad_6-.75,0,-0.20096189432334202,0.75,0,0').attributes.r.value);
    t.equals('60.896', svgElement.getElementById('grad_6-.75,0,-0.20096189432334202,0.75,0,0').attributes.fx.value);
    t.equals('47.342', svgElement.getElementById('grad_6-.75,0,-0.20096189432334202,0.75,0,0').attributes.fy.value);

    t.end();
});

test('percentRadialGradientTransform', t => {
    const svgString =
    `<svg version="1.1" width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <radialGradient id="grad_7" cx="60%" cy="80%" fx="75%" fy="85%">
          <stop offset="0" stop-color="#7F00FF" stop-opacity="1"/>
          <stop offset="1" stop-color="#FF9400" stop-opacity="1"/>
        </radialGradient>
      </defs>
      <g transform="scale(.75) skewX(-15)">
        <path id="path" fill="url(#grad_7)" stroke="#003FFF" stroke-width="5" d="${trickyBoundsPath}" />
      </g>
    </svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement, window, trickyBoundsPathBounds);
    comparisonFileAppend(svgString, svgElement, 'percentRadialGradientTransform');
    t.equals('50.7905', svgElement.getElementById('grad_7-.75,0,-0.20096189432334202,0.75,0,0').attributes.cx.value);
    t.equals('50.4343', svgElement.getElementById('grad_7-.75,0,-0.20096189432334202,0.75,0,0').attributes.cy.value);
    t.equals('30.9233', svgElement.getElementById('grad_7-.75,0,-0.20096189432334202,0.75,0,0').attributes.r.value);
    t.equals('59.2389', svgElement.getElementById('grad_7-.75,0,-0.20096189432334202,0.75,0,0').attributes.fx.value);
    t.equals('53.5267', svgElement.getElementById('grad_7-.75,0,-0.20096189432334202,0.75,0,0').attributes.fy.value);

    t.end();
});

test('userSpaceRadialGradientTransform', t => {
    const svgString =
    `<svg version="1.1" width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <radialGradient id="grad_8" cx="80" r="10" cy="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#7F00FF" stop-opacity="1"/>
          <stop offset="1" stop-color="#FF9400" stop-opacity="1"/>
        </radialGradient>
      </defs>
      <path id="path" fill="url(#grad_8)" stroke="#003FFF" stroke-width="5" d="${trickyBoundsPath}"
          transform="scale(.75) skewX(-15)" />
    </svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement, window, trickyBoundsPathBounds);
    comparisonFileAppend(svgString, svgElement, 'userSpaceRadialGradientTransform');
    t.equals('47.9423', svgElement.getElementById('grad_8-.75,0,-0.20096189432334202,0.75,0,0').attributes.cx.value);
    t.equals('45', svgElement.getElementById('grad_8-.75,0,-0.20096189432334202,0.75,0,0').attributes.cy.value);
    t.equals('7.5', svgElement.getElementById('grad_8-.75,0,-0.20096189432334202,0.75,0,0').attributes.r.value);

    t.end();
});

test('blackFillsBugFix', t => {
    const svgString =
    `<svg width="26px" height="14px" viewBox="0 0 26 14" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <g>
        <g id="Page-1" stroke="none" stroke-width="5" fill="none" fill-rule="evenodd">
          <path d="M23.87,0.75 C20.19,0.75 16.38,4.75 16.38,4.75 L16.38,9.25 C16.38,9.25 20.19,13.25 23.87,13.25
              C24.6811343,11.269062 25.0661499,9.139551 25,7 C25.0661499,4.860449 24.6811343,2.73093802 23.87,0.75 Z"
              id="Shape" stroke="#149948"/>
        </g>
      </g>
    </svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement, window,
        {
            height: 12.5,
            width: 24.020904541015625,
            x: 0.9896308183670044,
            y: 0.75
        });
    comparisonFileAppend(svgString, svgElement, 'blackFillsBugFix');
    t.equals('none', svgElement.getElementById('Shape').attributes.fill.value);
    t.equals('5', svgElement.getElementById('Shape').attributes['stroke-width'].value);

    t.end();
});

outputComparisonFile();
