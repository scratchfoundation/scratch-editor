// Test transform-applier

const test = require('tap').test;
const jsdom = require('jsdom');
const {JSDOM} = jsdom;
const transformStrokeWidths = require('../src/transform-applier');

// PathData, absolute instructions only
const d = 'M -20 -20 0 10 L 5 5 H 10 V 10 C 10 10 20 10 15 25 S 15 30 15 40 ' +
    'Q 20 50 30 60 T 30 70 20 80 A 30 90 0 10 1 0 100 Z ';

const {window} = new JSDOM();
const parser = new window.DOMParser();

// No transform attribute on the path
test('noTransformPath', t => {
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="100px" height="100px" viewBox="0 0 100 100">` +
            `<path id="path" fill="#0000" stroke="red" stroke-width="1" d="${d}"/>` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement);

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

    t.equals(d, svgElement.getElementById('path').attributes.d.value);
    t.false(svgElement.getElementById('path').attributes.transform);
    t.end();
});

// Transform is not identity matrix
test('transformPath', t => {
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="100px" height="100px" viewBox="0 0 100 100">` +
            `<path transform="matrix(2 0 0 2 0 0)" id="path" fill="#0000" stroke="red" stroke-width="1" d="${d}"/>` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement);

    const doubled = 'M -40 -40 L 0 20 L 10 10 L 20 10 L 20 20 C 20 20 40 20 30 50 ' +
    'C 40 80 30 60 30 80 Q 40 100 60 120 Q 80 140 60 140 Q 40 140 40 160 ' +
    'A 59.99999999999999 180.00000000000034 0.0000012006191900413034 10 1 0 200 Z ';
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

    t.equals(d, svgElement.getElementById('path').attributes.d.value);
    t.false(svgElement.getElementById('path').attributes.transform);
    t.end();
});

// Transform has multiple matrices that don't compose to identity
test('composedTransformPath', t => {
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="100px" height="100px" viewBox="0 0 100 100">` +
            `<path transform="matrix(.5,0,0,.5,0,0) matrix(3,0,0,3,1,2)" id="path" ` +
                `fill="#0000" stroke="red" stroke-width="1" d="${d}"/>` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement);

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
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="100px" height="100px" viewBox="0 0 100 100">` +
            `<g id="group" transform="matrix(2, 0, 0, 2, 0, 0)">` +
            `<path id="path" fill="#0000" stroke="red" stroke-width="1" d="${d}"/>` +
            `</g>` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement);

    const doubled = 'M -40 -40 L 0 20 L 10 10 L 20 10 L 20 20 C 20 20 40 20 30 50 ' +
    'C 40 80 30 60 30 80 Q 40 100 60 120 Q 80 140 60 140 Q 40 140 40 160 ' +
    'A 59.99999999999999 180.00000000000034 0.0000012006191900413034 10 1 0 200 Z ';
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

    t.equals(d, svgElement.getElementById('path').attributes.d.value);
    transformStrokeWidths(svgElement);
    t.equals(d, svgElement.getElementById('path').attributes.d.value);
    t.end();
});

// Transforms on parents and children
test('nestedTransformPath', t => {
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="100px" height="100px" viewBox="0 0 100 100">` +
            `<g transform=" matrix(0.5 0 0 0.5 0 0) ">` +
                `<g>` +
                    `<path transform="matrix(.5,0,0,.5,0,0)" id="path" fill="#0000" stroke="red" stroke-width="1" d="${d}"/>` +
                `</g>` +
            `</g>` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement);

    // TODO this may be wrong
    const quartered = 'M -5 -5 L 0 2.5 L 1.25 1.25 L 2.5 1.25 L 2.5 2.5 C 2.5 2.5 5 2.5 3.75 6.25 C 5 10 3.75 7.5 3.75 10 Q 5 12.5 7.5 15 Q 10 17.5 7.5 17.5 Q 5 17.5 5 20 A 7.499999999999999 22.500000000000043 0.0000012006191900413034 10 1 0 25 Z ';
    t.equals(quartered, svgElement.getElementById('path').attributes.d.value);
    t.end();
});

// Transform combines all types of transforms
test('variousTransformsPath', t => {
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="100px" height="100px" viewBox="0 0 100 100">` +
            `<path transform="rotate(25) matrix(.5,0,0,.5,0,0) skewX(10) ` +
                `translate(20) rotate(25, 100, 100) skewY(-10) translate(-10, 4) scale(.5,0.2)" ` +
                `id="path" fill="#0000" stroke="red" stroke-width="1" d="${d}"/>` +
        `</svg>`;
    //console.log(svgString);
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement);
    //console.log(new window.XMLSerializer().serializeToString(svgElement));

    // TODO this may be wrong
    const transformedPath = 'M 28.58356008971865 -7.7175607669212845 L 30.81923314334377 -2.225145913652451 L 32.15466459867296 -1.7399481522832085 L 33.179490777232985 -0.8995880101347797 L 32.86888550046382 -0.5444256293555934 C 32.86888550046382 -0.5444256293555934 34.91853785758387 1.1362946549412642 32.96189584871635 1.3614216551303944 C 33.05490619696889 3.2672689396163825 32.65129057194719 1.7165840359095812 32.03008001840887 2.426908797467954 Q 32.43369564343057 3.9775937011747553 33.86213744701229 6.368638747029986 Q 35.290579250594014 8.759683792885216 33.24092689347396 7.078963508588358 Q 31.191274536353912 5.398243224291501 30.570063982815586 6.108567985849873 A 3.926367602048178 17.191462145518155 -71.25596186544531 10 1 25.228338161498833 4.167776940372903 Z ';
    t.equals(transformedPath, svgElement.getElementById('path').attributes.d.value);
    t.false(svgElement.getElementById('path').attributes.transform);
    t.end();
});

// Transform is pushed down to other children
test('siblingsTransformPath', t => {
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="100px" height="100px" viewBox="0 0 100 100">` +
            `<g transform="matrix(0.5 0 0 0.5 0 0)">` +
                `<g transform="translate(10, 20)">` +
                    `<path transform="matrix(.5 0 0 .5 0 0)" id="path" fill="#0000" stroke="red" stroke-width="1" d="${d}"/>` +
                    `<shape id="sibling"/>` +
                `</g>` +
                `<shape id="distantCousin1" transform="translate(-0.5,-.5)" />` +
                `<shape id="distantCousin2" />` +
            `</g>` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement);

    t.equals('matrix(0.5,0,0,0.5,5,10)', svgElement.getElementById('sibling').attributes.transform.value);
    t.equals('matrix(0.5,0,0,0.5,-0.25,-0.25)', svgElement.getElementById('distantCousin1').attributes.transform.value);
    t.equals('matrix(0.5,0,0,0.5,0,0)', svgElement.getElementById('distantCousin2').attributes.transform.value);
    t.end();
});

// Stroke width is pushed down to leaf level
test('siblingsStroke', t => {
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="100px" height="100px" viewBox="0 0 100 100">` +
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

    t.equals('10', svgElement.getElementById('sibling').attributes['stroke-width'].value);
    t.equals('15', svgElement.getElementById('distantCousin1').attributes['stroke-width'].value);
    t.equals('5', svgElement.getElementById('distantCousin2').attributes['stroke-width'].value);
    t.end();
});

// Stroke width is transformed
test('transformedStroke', t => {
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="100px" height="100px" viewBox="0 0 100 200">` +
            `<path transform="matrix(.5 0 0 2 0 0)" fill="#0000" stroke="red" stroke-width="1" d="${d}" id="path"/>` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement);

    const quadraticMean = Math.sqrt(((.5 * .5) + (2 * 2)) / 2);
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

    t.equals(pathData, svgElement.getElementById('path').attributes.d.value);
    t.end();
});

// Testing specifically elliptical paths
test('variousTransformsEllipticalPath', t => {
    const pathData = 'M600,350 l 50,-25  ' +
        'a25,25 -60 0,1 50,-25 l 50,-25  ' +
        'a25,50 -45 0,1 50,-25 l 50,-25  ' +
        'a25,75 -30 0,1 50,-25 l 50,-25  ' +
        'a25,100 -15 0,1 50,-25 l 50,-25 ';

    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="600px" height="300px" viewBox="0 0 600 300"> ` +
            `<path transform="skewX(10) rotate(-25) translate(5 20)" ` +
                `id="path" fill="#0000" stroke="red" stroke-width="5" d="${pathData}"/>` +
        `</svg>`;
    console.log(svgString);
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement);
    console.log(new window.XMLSerializer().serializeToString(svgElement));

    t.equals(pathData, svgElement.getElementById('path').attributes.d.value);
    t.end();
});
