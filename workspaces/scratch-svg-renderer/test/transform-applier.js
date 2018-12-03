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
        `<html><body>${comparisonFileString}\n</body></html>`,
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

// Transform on a simple box
test('transformBox', t => {
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="250px" height="250px" viewBox="0 0 250 250">` +
            `<path transform="matrix(20 0 0 10 45 45)" id="path" fill="#0000" stroke="red" stroke-width="1" ` +
                `d="M0,0 h 10 v 10 h -10 z"/>` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement);
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
    transformStrokeWidths(svgElement);
    comparisonFileAppend(svgString, svgElement, 'transformPath');

    const doubled = 'M 5 5 L 45 65 L 55 55 L 65 55 L 65 65 C 65 65 85 65 75 95 C 65 125 75 105 75 125 ' +
    'Q 85 145 105 165 Q 125 185 105 185 Q 85 185 85 205 M 45 45 A 80.00000000000001 99.99999999999996 0 1 1 45 245 Z ';
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

    const transformedPath = 'M -29.5 -29 L 0.5 16 L 8 8.5 L 15.5 8.5 L 15.5 16 C 15.5 16 30.5 16 23 38.5 ' +
    'C 15.5 61 23 46 23 61 Q 30.5 76 45.5 91 Q 60.5 106 45.5 106 Q 30.5 106 30.5 121 M 0.5 1 ' +
    'A 60 74.99999999999999 0 1 1 0.5 151 Z ';
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

    const doubled = 'M -40 -40 L 0 20 L 10 10 L 20 10 L 20 20 C 20 20 40 20 30 50 C 20 80 30 60 30 80 ' +
    'Q 40 100 60 120 Q 80 140 60 140 Q 40 140 40 160 M 0 0 A 80.00000000000001 99.99999999999996 0 1 1 0 200 Z ';
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
                    `<path transform="matrix(1.5,0,0,1.5,0,0)" id="path" fill="#0000" stroke="red" stroke-width="1" ` +
                        `d="${d}"/>` +
                `</g>` +
            `</g>` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement);
    comparisonFileAppend(svgString, svgElement, 'nestedTransformPath');

    const quartered = 'M -45 -45 L 0 22.5 L 11.25 11.25 L 22.5 11.25 L 22.5 22.5 C 22.5 22.5 45 22.5 33.75 56.25 ' +
    'C 22.5 90 33.75 67.5 33.75 90 Q 45 112.5 67.5 135 Q 90 157.5 67.5 157.5 Q 45 157.5 45 180 M 0 0 ' +
    'A 90.00000000000003 112.49999999999996 0 1 1 0 225 Z ';
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

    // TODO needs fixing
    const transformedPath = 'M 115.31721821873026 96.78658123188508 L 134.6907682197718 171.21945660981157 ' +
    'L 151.9583667907987 175.62118022312572 L 164.256280933519 185.70550192890687 L 159.2865965052124 ' +
    '191.38810002137384 C 159.2865965052124 191.38810002137384 183.88242479065298 211.55674343293614 ' +
    '156.67545736301287 218.52021600455595 C 129.46848993537273 225.48368857617575 151.70577293470626 ' +
    '224.20281409702292 141.76640407809305 235.5680102819569 Q 144.12494936420012 257.017528172672 ' +
    '158.78140879302748 288.5513677691682 Q 173.43786822185484 320.0852073656645 148.84203993641427 ' +
    '299.91656395410223 Q 124.24621165097366 279.74792054253993 114.30684279436045 291.1131167274739 ' +
    'M 144.630137076385 159.8542604248776 A 67.77131872547072 141.65284342315738 83.20032224507169 1 1 ' +
    '45.23644851025281 273.50622227421724 Z ';
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
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="650px" height="320px" viewBox="-100 -50 550 270">` +
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
    const pathData = 'm 20 20 0 20 10 0 l 5 5 h 10 v 10 c 0 10 0 20 15 5 z ' +
        'm -50 5 s 15 0 15 10 q 20 10 10 20 t 20 10 20 10 a 30 10 30 1 1 0 1 ';
    const svgString =
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="200px" height="150px" viewBox="0 0 200 150">` +
            `<path transform="skewX(10) rotate(-25) translate(5 20)" ` +
                `id="path" fill="#0000" stroke="red" stroke-width="5" d="${pathData}" />` +
        `</svg>`;
    const svgElement = parser.parseFromString(svgString, 'text/xml').documentElement;
    transformStrokeWidths(svgElement);
    comparisonFileAppend(svgString, svgElement, 'variousTransformsRelativePath');

    const transformed = 'M 44.09171072064901 25.68685493794851 L 55.74020626907786 43.81301067868151 ' +
    'L 64.05809411859438 39.58682806127452 L 71.12916193045987 42.00527568775426 L 79.4470497799764 ' +
    '37.77909307034727 L 85.27129755419082 46.84217094071378 C 91.09554532840525 55.90524881108028 ' +
    '96.91979310261966 64.96832668144677 100.66025321557282 45.034435949786534 Z M 5.414395360173593 ' +
    '51.349306960166736 C 5.414395360173593 51.349306960166736 17.891227134448382 45.01003303405624 ' +
    '23.715474908662806 54.07311090442274 Q 46.17549838191028 54.68382353997525 43.68185830660818 ' +
    '67.97308402774874 Q 41.18821823130608 81.26234451552224 66.14188177985567 68.58379666330126 ' +
    'Q 91.09554532840525 55.90524881108028 88.60190525310314 69.19450929885376 A 10.70784855492271 ' +
    '28.016832556160946 85.85393271049736 1 1 89.18433003052458 70.10081708589041 ';
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
    transformStrokeWidths(svgElement);
    comparisonFileAppend(svgString, svgElement, 'scaleTransformEllipticalPath');

    const scaled = 'M 5 150 L 30 137.5 A 12.500000000000002 12.499999999999998 -50.76847951640775 0 1 55 125 ' +
    'L 80 112.5 A 12.500000000000002 24.999999999999982 -45.00000000000001 0 1 105 100 L 130 87.5 ' +
    'A 12.500000000000002 37.49999999999991 -29.99999999999998 0 1 155 75 L 180 62.5 ' +
    'A 12.499999999999996 50.000000000000206 -15.000000000000053 0 1 205 50 L 230 37.5 L 230 62.5 L 205 75 ' +
    'A 12.500000000000002 12.499999999999998 -50.76847951640775 1 1 180 87.5 L 155 100 ' +
    'A 12.500000000000002 24.999999999999982 45.00000000000001 1 1 130 112.5 L 105 125 ' +
    'A 12.500000000000002 37.49999999999991 29.99999999999998 1 1 80 137.5 L 55 150 ' +
    'A 12.499999999999996 50.000000000000206 15.000000000000053 1 1 30 162.5 L 5 175 ';
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

    // TODO needs fixing
    const transformed = 'M 24.970926344078123 107.53550917329295 L 51.99974615612473 63.74690141034176 ' +
    'A 22.892884682887487 27.30105920059912 17.480815613351304 0 1 79.02856596817128 19.958293647390548 ' +
    'L 106.05738578021788 -23.830314115560668 A 27.28811760189659 45.807483617452675 -76.01268588681417 0 1 ' +
    '133.08620559226443 -67.61892187851191 L 160.11502540431098 -111.40752964146313 ' +
    'A 27.02230505731781 69.38712282401073 -56.966365476158984 0 1 187.1438452163576 -155.19613740441434 ' +
    'L 214.17266502840414 -198.98474516736553 A 26.12868527068851 95.68028295723471 -40.03756985566268 0 1 ' +
    '241.2014848404507 -242.77335293031678 L 268.2303046524973 -286.561960693268 ' +
    'L 297.3515435235694 -241.24657134143553 L 270.3227237115228 -197.45796357848428 ' +
    'A 22.892884682887487 27.30105920059912 17.480815613351304 1 1 243.29390389947628 -153.66935581553307 ' +
    'L 216.26508408742973 -109.88074805258185 A 22.898861302579267 54.58786720801723 15.558204334448789 1 1 ' +
    '189.23626427538312 -66.0921402896306 L 162.20744446333657 -22.30353252667939 ' +
    'A 23.196383522539648 80.83156575584647 3.1778441907889654 1 1 135.17862465129002 21.485075236271825 ' +
    'L 108.14980483924336 65.27368299922301 A 23.925862510227205 104.48944103609008 -10.138643214435135 1 1 ' +
    '81.12098502719681 109.06229076217426 L 54.09216521515026 152.85089852512544 ';
    t.equals(transformed, svgElement.getElementById('path').attributes.d.value);
    t.end();
});

outputComparisonFile();
