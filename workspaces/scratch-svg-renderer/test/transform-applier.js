// Test transform-applier

const test = require('tap').test;
const jsdom = require('jsdom');
const {JSDOM} = jsdom;
const transformStrokeWidths = require('../src/transform-applier');

// PathData, absolute instructions only
const d = 'M -20 -20 0 10 L 5 5 H 10 V 10 C 10 10 20 10 15 25 S 15 30 15 40 ' +
    'Q 20 50 30 60 T 30 70 20 80 A 30 90 0 10 1 0 100 Z ';
const ellipticalPath = 'M10,300 l 50,-25  ' +
    'a25,25 -60 0,1 50,-25 l 50,-25  ' +
    'a25,50 -45 0,1 50,-25 l 50,-25  ' +
    'a25,75 -30 0,1 50,-25 l 50,-25  ' +
    'a25,100 -15 0,1 50,-25 l 50,-25 v 50 l -50,25  ' +
    'a25,25 60 1,1 -50,25 l -50,25  ' +
    'a25,50 45 1,1 -50,25 l -50,25  ' +
    'a25,75 30 1,1 -50,25 l -50,25  ' +
    'a25,100 15 1,1 -50,25 l -50,25  ';

const {window} = new JSDOM();
const parser = new window.DOMParser();
const fs = require('fs');
const OUTPUT_COMPARISON_FILES = true;
let comparisonFileString = '';

const comparisonFileAppend = function (svgString, svgElement, name) {
    if (!OUTPUT_COMPARISON_FILES) return;
    const newSvgString = new window.XMLSerializer().serializeToString(svgElement);
    comparisonFileString +=
        `<p>${name}</p>
        <div style="border-style: solid; border-width: 1px;">
            ${svgString}
        </div>
        <div style="border-style: solid; border-width: 0 1px 1px 1px;">
            ${newSvgString}
        </div>`;
};

const outputComparisonFile = function () {
    if (!OUTPUT_COMPARISON_FILES) return;
    fs.writeFile(
        `${__dirname}/test-output/transform-applier-test.html`,
        `<html><body>${comparisonFileString}\n</body></html>`,
        err => console.log(err)
    );
};

// No transform attribute on the path
test('noTransformPath', t => {
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="100px" height="100px" viewBox="0 0 100 100">` +
            `<path id="path" fill="#0000" stroke="red" stroke-width="1" d="${d}"/>` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement);
    comparisonFileAppend(svgString, svgElement, 'noTransformPath');

    t.equals(d, svgElement.getElementById('path').attributes.d.value);
    t.false(svgElement.getElementById('path').attributes.transform);
    t.end();
});

// Transform is identity matrix
test('identityTransformPath', t => {
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="100px" height="100px" viewBox="0 0 100 100">` +
            `<path transform="matrix(1 0 0 1 0 0)" id="path" fill="#0000" stroke="red" stroke-width="1" d="${d}"/>` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement);
    comparisonFileAppend(svgString, svgElement, 'identityTransformPath');

    t.equals(d, svgElement.getElementById('path').attributes.d.value);
    t.false(svgElement.getElementById('path').attributes.transform);
    t.end();
});

// Transform is not identity matrix
test('transformPath', t => {
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="250px" height="250px" viewBox="0 0 250 250">` +
            `<path transform="matrix(2 0 0 2 45 45)" id="path" fill="#0000" stroke="red" stroke-width="1" d="${d}"/>` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement);
    comparisonFileAppend(svgString, svgElement, 'transformPath');

    const doubled = 'M -40 -40 L 0 20 L 10 10 L 20 10 L 20 20 C 20 20 40 20 30 50 C 40 80 30 60 30 80 Q 40 100 60 120 Q 80 140 60 140 Q 40 140 40 160 A 59.99999999999999 180.00000000000034 0.0000012006191900413034 10 1 0 200 Z ';
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
    transformStrokeWidths(svgElement);
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
    transformStrokeWidths(svgElement);
    comparisonFileAppend(svgString, svgElement, 'composedTransformPath');

    // TODO this is wrong
    const transformedPath = 'M -29.5 -29 L 0.5 16 L 8 8.5 L 15.5 8.5 L 15.5 16 C 15.5 16 30.5 16 23 38.5 ' +
    'C 30.5 61 23 46 23 61 Q 30.5 76 45.5 91 Q 60.5 106 45.5 106 Q 30.5 106 30.5 121 ' +
    'A 45.00000000000002 134.99999999999957 0 10 1 0.5 151 Z ';
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
    transformStrokeWidths(svgElement);
    comparisonFileAppend(svgString, svgElement, 'parentTransformPath');

    const doubled = 'M -40 -40 L 0 20 L 10 10 L 20 10 L 20 20 C 20 20 40 20 30 50 C 40 80 30 60 30 80 Q 40 100 60 120 Q 80 140 60 140 Q 40 140 40 160 A 59.99999999999999 180.00000000000034 0.0000012006191900413034 10 1 0 200 Z ';
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
    transformStrokeWidths(svgElement);
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
                    `<path transform="matrix(1.5,0,0,1.5,0,0)" id="path" fill="#0000" stroke="red" stroke-width="1" d="${d}"/>` +
                `</g>` +
            `</g>` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement);
    comparisonFileAppend(svgString, svgElement, 'nestedTransformPath');

    // TODO this may be wrong
    const quartered = 'M -5 -5 L 0 2.5 L 1.25 1.25 L 2.5 1.25 L 2.5 2.5 C 2.5 2.5 5 2.5 3.75 6.25 C 5 10 3.75 7.5 3.75 10 Q 5 12.5 7.5 15 Q 10 17.5 7.5 17.5 Q 5 17.5 5 20 A 7.499999999999999 22.500000000000043 0.0000012006191900413034 10 1 0 25 Z ';
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
    transformStrokeWidths(svgElement);
    comparisonFileAppend(svgString, svgElement, 'variousTransformsPath');

    // TODO this may be wrong
    const transformedPath = 'M 28.58356008971865 -7.7175607669212845 L 30.81923314334377 -2.225145913652451 L 32.15466459867296 -1.7399481522832085 L 33.179490777232985 -0.8995880101347797 L 32.86888550046382 -0.5444256293555934 C 32.86888550046382 -0.5444256293555934 34.91853785758387 1.1362946549412642 32.96189584871635 1.3614216551303944 C 33.05490619696889 3.2672689396163825 32.65129057194719 1.7165840359095812 32.03008001840887 2.426908797467954 Q 32.43369564343057 3.9775937011747553 33.86213744701229 6.368638747029986 Q 35.290579250594014 8.759683792885216 33.24092689347396 7.078963508588358 Q 31.191274536353912 5.398243224291501 30.570063982815586 6.108567985849873 A 3.926367602048178 17.191462145518155 -71.25596186544531 10 1 25.228338161498833 4.167776940372903 Z ';
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
                    `<path transform="matrix(2 0 0 2 0 0)" id="path" fill="#0000" stroke="red" stroke-width="1" d="${d}"/>` +
                    `<shape id="sibling"/>` +
                `</g>` +
                `<shape id="distantCousin1" transform="translate(-0.5,-.5)" />` +
                `<shape id="distantCousin2" />` +
            `</g>` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement);
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
                    `<path transform="matrix(.5 0 0 .5 0 0)" fill="#0000" stroke="red" stroke-width="1" d="${d}" id="path"/>` +
                    `<shape id="sibling"/>` +
                `</g>` +
                `<shape id="distantCousin1" stroke-width="15" />` +
                `<shape id="distantCousin2" />` +
            `</g>` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement);
    comparisonFileAppend(svgString, svgElement, 'siblingsStroke');

    t.equals('10', svgElement.getElementById('sibling').attributes['stroke-width'].value);
    t.equals('15', svgElement.getElementById('distantCousin1').attributes['stroke-width'].value);
    t.equals('5', svgElement.getElementById('distantCousin2').attributes['stroke-width'].value);
    t.end();
});

// Stroke width is transformed
test('transformedStroke', t => {
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="650px" height="350px" viewBox="-100 -100 550 250">` +
            `<path transform="matrix(5 0 0 2 0 0)" fill="#0000" stroke="red" stroke-width="1" d="${d}" id="path"/>` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement);
    comparisonFileAppend(svgString, svgElement, 'transformedStroke');

    const quadraticMean = Math.sqrt(((5 * 5) + (2 * 2)) / 2);
    t.equals(`${quadraticMean}`, svgElement.getElementById('path').attributes['stroke-width'].value);
    t.end();
});

// Various transforms applied to a path with relative instructions
test('variousTransformsRelativePath', t => {
    const pathData = 'm 20 20 0 10 l 5 5 h 10 v 10 c 0 10 0 20 15 5 ' +
        'm -50 5 s 15 0 15 10 q 20 10 10 20 t 20 10 20 10 a 30 10 0 10 1 0 50 z';
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="100px" height="100px" viewBox="0 0 100 100">` +
            `<path transform="skewX(10) rotate(-25) translate(5 20)" ` +
                `id="path" fill="#0000" stroke="red" stroke-width="5" d="${pathData}" />` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement);
    comparisonFileAppend(svgString, svgElement, 'variousTransformsRelativePath');

    t.equals(pathData, svgElement.getElementById('path').attributes.d.value);
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
    transformStrokeWidths(svgElement);
    comparisonFileAppend(svgString, svgElement, 'scaleTransformEllipticalPath');

    const scaled = 'M 0 10 L 25 97.5 A 12.500000000000002 12.499999999999998 50.76847951640775 0 1 50 85 L 75 72.5 A 12.500000000000002 24.999999999999982 -45.00000000000001 0 1 100 60 L 125 47.5 A 12.500000000000002 37.49999999999991 -29.99999999999998 0 1 150 35 L 175 22.5 A 12.499999999999996 50.000000000000206 -15.000000000000053 0 1 200 10 L 225 -2.5 L 225 22.5 L 200 35 A 12.500000000000002 12.499999999999998 50.76847951640775 1 1 175 47.5 L 150 60 A 12.500000000000002 24.999999999999982 45.00000000000001 1 1 125 72.5 L 100 85 A 12.500000000000002 37.49999999999991 29.99999999999998 1 1 75 97.5 L 50 110 A 12.499999999999996 50.000000000000206 15.000000000000053 1 1 25 122.5 L 0 135 ';
    t.equals(scaled, svgElement.getElementById('path').attributes.d.value);
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
    transformStrokeWidths(svgElement);
    comparisonFileAppend(svgString, svgElement, 'variousTransformsEllipticalPath');

    t.equals(ellipticalPath, svgElement.getElementById('path').attributes.d.value);
    t.end();
});

outputComparisonFile();
