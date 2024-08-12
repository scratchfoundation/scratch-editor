const Matrix = require('transformation-matrix');
const SvgElement = require('./svg-element');
const log = require('./util/log');

/**
 * @fileOverview Apply transforms to match stroke width appearance in 2.0 and 3.0
 */

// Adapted from paper.js's Path.applyTransform
const _parseTransform = function (domElement) {
    let matrix = Matrix.identity();
    const string = domElement.attributes && domElement.attributes.transform && domElement.attributes.transform.value;
    if (!string) return matrix;
    // https://www.w3.org/TR/SVG/types.html#DataTypeTransformList
    // Parse SVG transform string. First we split at /)\s*/, to separate
    // commands
    const transforms = string.split(/\)\s*/g);
    for (const transform of transforms) {
        if (!transform) break;
        // Command come before the '(', values after
        const parts = transform.split(/\(\s*/);
        const command = parts[0].trim();
        const v = parts[1].split(/[\s,]+/g);
        // Convert values to floats
        for (let j = 0; j < v.length; j++) {
            v[j] = parseFloat(v[j]);
        }
        switch (command) {
        case 'matrix':
            matrix = Matrix.compose(matrix, {a: v[0], b: v[1], c: v[2], d: v[3], e: v[4], f: v[5]});
            break;
        case 'rotate':
            matrix = Matrix.compose(matrix, Matrix.rotateDEG(v[0], v[1] || 0, v[2] || 0));
            break;
        case 'translate':
            matrix = Matrix.compose(matrix, Matrix.translate(v[0], v[1] || 0));
            break;
        case 'scale':
            matrix = Matrix.compose(matrix, Matrix.scale(v[0], v[1] || v[0]));
            break;
        case 'skewX':
            matrix = Matrix.compose(matrix, Matrix.skewDEG(v[0], 0));
            break;
        case 'skewY':
            matrix = Matrix.compose(matrix, Matrix.skewDEG(0, v[0]));
            break;
        default:
            log.error(`Couldn't parse: ${command}`);
        }
    }
    return matrix;
};

// Adapted from paper.js's Matrix.decompose
// Given a matrix, return the x and y scale factors of the matrix
const _getScaleFactor = function (matrix) {
    const a = matrix.a;
    const b = matrix.b;
    const c = matrix.c;
    const d = matrix.d;
    const det = (a * d) - (b * c);

    if (a !== 0 || b !== 0) {
        const r = Math.sqrt((a * a) + (b * b));
        return {x: r, y: det / r};
    }
    if (c !== 0 || d !== 0) {
        const s = Math.sqrt((c * c) + (d * d));
        return {x: det / s, y: s};
    }
    // a = b = c = d = 0
    return {x: 0, y: 0};
};

// Returns null if matrix is not invertible. Otherwise returns given ellipse
// transformed by transform, an object {radiusX, radiusY, rotation}.
const _calculateTransformedEllipse = function (radiusX, radiusY, theta, transform) {
    theta = -theta * Math.PI / 180;
    const a = transform.a;
    const b = -transform.c;
    const c = -transform.b;
    const d = transform.d;
    // Since other parameters determine the translation of the ellipse in SVG, we do not need to worry
    // about what e and f are.
    const det = (a * d) - (b * c);
    // Non-invertible matrix
    if (det === 0) return null;

    // rotA, rotB, and rotC represent Ax^2 + Bxy + Cy^2 = 1 coefficients for a rotated ellipse formula
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);
    const sin2T = Math.sin(2 * theta);
    const rotA = (cosT * cosT / radiusX / radiusX) + (sinT * sinT / radiusY / radiusY);
    const rotB = (sin2T / radiusX / radiusX) - (sin2T / radiusY / radiusY);
    const rotC = (sinT * sinT / radiusX / radiusX) + (cosT * cosT / radiusY / radiusY);

    // Calculate the ellipse formula of the transformed ellipse
    // A, B, and C represent Ax^2 + Bxy + Cy^2 = 1 / det / det coefficients in a transformed ellipse formula
    // scaled by inverse det squared (to preserve accuracy)
    const A = ((rotA * d * d) - (rotB * d * c) + (rotC * c * c));
    const B = ((-2 * rotA * b * d) + (rotB * a * d) + (rotB * b * c) - (2 * rotC * a * c));
    const C = ((rotA * b * b) - (rotB * a * b) + (rotC * a * a));

    // Derive new radii and theta from the transformed ellipse formula
    const newRadiusXOverDet = Math.sqrt(2) *
        Math.sqrt(
            (A + C - Math.sqrt((A * A) + (B * B) - (2 * A * C) + (C * C))) /
            ((-B * B) + (4 * A * C))
        );
    const newRadiusYOverDet = 1 / Math.sqrt(A + C - (1 / newRadiusXOverDet / newRadiusXOverDet));
    let temp = (A - (1 / newRadiusXOverDet / newRadiusXOverDet)) /
        ((1 / newRadiusYOverDet / newRadiusYOverDet) - (1 / newRadiusXOverDet / newRadiusXOverDet));
    if (temp < 0 && Math.abs(temp) < 1e-8) temp = 0; // Fix floating point issue
    temp = Math.sqrt(temp);
    if (Math.abs(1 - temp) < 1e-8) temp = 1; // Fix floating point issue
    // Solve for which of the two possible thetas is correct
    let newTheta = Math.asin(temp);
    temp = (B / (
        (1 / newRadiusXOverDet / newRadiusXOverDet) -
        (1 / newRadiusYOverDet / newRadiusYOverDet)));
    const newTheta2 = -newTheta;
    if (Math.abs(Math.sin(2 * newTheta2) - temp) <
        Math.abs(Math.sin(2 * newTheta) - temp)) {
        newTheta = newTheta2;
    }

    return {
        radiusX: newRadiusXOverDet * det,
        radiusY: newRadiusYOverDet * det,
        rotation: -newTheta * 180 / Math.PI
    };
};

// Adapted from paper.js's PathItem.setPathData
const _transformPath = function (pathString, transform) {
    if (!transform || Matrix.toString(transform) === Matrix.toString(Matrix.identity())) return pathString;
    // First split the path data into parts of command-coordinates pairs
    // Commands are any of these characters: mzlhvcsqta
    const parts = pathString && pathString.match(/[mlhvcsqtaz][^mlhvcsqtaz]*/ig);
    let coords;
    let relative = false;
    let previous;
    let control;
    let current = {x: 0, y: 0};
    let start = {x: 0, y: 0};
    let result = '';

    const getCoord = function (index, coord) {
        let val = +coords[index];
        if (relative) {
            val += current[coord];
        }
        return val;
    };

    const getPoint = function (index) {
        return {x: getCoord(index, 'x'), y: getCoord(index + 1, 'y')};
    };

    const roundTo4Places = function (num) {
        return Number(num.toFixed(4));
    };

    // Returns the transformed point as a string
    const getString = function (point) {
        const transformed = Matrix.applyToPoint(transform, point);
        return `${roundTo4Places(transformed.x)} ${roundTo4Places(transformed.y)} `;
    };

    for (let i = 0, l = parts && parts.length; i < l; i++) {
        const part = parts[i];
        const command = part[0];
        const lower = command.toLowerCase();
        // Match all coordinate values
        coords = part.match(/[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/g);
        const length = coords && coords.length;
        relative = command === lower;
        // Fix issues with z in the middle of SVG path data, not followed by
        // a m command, see paper.js#413:
        if (previous === 'z' && !/[mz]/.test(lower)) {
            result += `M ${current.x} ${current.y} `;
        }
        switch (lower) {
        case 'm': // Move to
        case 'l': // Line to
        {
            let move = lower === 'm';
            for (let j = 0; j < length; j += 2) {
                result += move ? 'M ' : 'L ';
                current = getPoint(j);
                result += getString(current);
                if (move) {
                    start = current;
                    move = false;
                }
            }
            control = current;
            break;
        }
        case 'h': // Horizontal line
        case 'v': // Vertical line
        {
            const coord = lower === 'h' ? 'x' : 'y';
            current = {x: current.x, y: current.y}; // Clone as we're going to modify it.
            for (let j = 0; j < length; j++) {
                current[coord] = getCoord(j, coord);
                result += `L ${getString(current)}`;
            }
            control = current;
            break;
        }
        case 'c':
            // Cubic Bezier curve
            for (let j = 0; j < length; j += 6) {
                const handle1 = getPoint(j);
                control = getPoint(j + 2);
                current = getPoint(j + 4);
                result += `C ${getString(handle1)}${getString(control)}${getString(current)}`;
            }
            break;
        case 's':
            // Smooth cubic Bezier curve
            for (let j = 0; j < length; j += 4) {
                const handle1 = /[cs]/.test(previous) ?
                    {x: (current.x * 2) - control.x, y: (current.y * 2) - control.y} :
                    current;
                control = getPoint(j);
                current = getPoint(j + 2);

                result += `C ${getString(handle1)}${getString(control)}${getString(current)}`;
                previous = lower;
            }
            break;
        case 'q':
            // Quadratic Bezier curve
            for (let j = 0; j < length; j += 4) {
                control = getPoint(j);
                current = getPoint(j + 2);
                result += `Q ${getString(control)}${getString(current)}`;
            }
            break;
        case 't':
            // Smooth quadratic Bezier curve
            for (let j = 0; j < length; j += 2) {
                control = /[qt]/.test(previous) ?
                    {x: (current.x * 2) - control.x, y: (current.y * 2) - control.y} :
                    current;
                current = getPoint(j);

                result += `Q ${getString(control)}${getString(current)}`;
                previous = lower;
            }
            break;
        case 'a':
            // Elliptical arc curve
            for (let j = 0; j < length; j += 7) {
                current = getPoint(j + 5);
                const rx = +coords[j];
                const ry = +coords[j + 1];
                const rotation = +coords[j + 2];
                const largeArcFlag = +coords[j + 3];
                let clockwiseFlag = +coords[j + 4];
                const newEllipse = _calculateTransformedEllipse(rx, ry, rotation, transform);
                const matrixScale = _getScaleFactor(transform);
                if (newEllipse) {
                    if ((matrixScale.x > 0 && matrixScale.y < 0) ||
                        (matrixScale.x < 0 && matrixScale.y > 0)) {
                        clockwiseFlag = clockwiseFlag ^ 1;
                    }
                    result += `A ${roundTo4Places(Math.abs(newEllipse.radiusX))} ` +
                        `${roundTo4Places(Math.abs(newEllipse.radiusY))} ` +
                        `${roundTo4Places(newEllipse.rotation)} ${largeArcFlag} ` +
                        `${clockwiseFlag} ${getString(current)}`;
                } else {
                    result += `L ${getString(current)}`;
                }
            }
            break;
        case 'z':
            // Close path
            result += `Z `;
            // Correctly handle relative m commands, see paper.js#1101:
            current = start;
            break;
        }
        previous = lower;
    }
    return result;
};

const GRAPHICS_ELEMENTS = ['circle', 'ellipse', 'image', 'line', 'path', 'polygon', 'polyline', 'rect', 'text', 'use'];
const CONTAINER_ELEMENTS = ['a', 'defs', 'g', 'marker', 'glyph', 'missing-glyph', 'pattern', 'svg', 'switch', 'symbol'];
const _isContainerElement = function (element) {
    return element.tagName && CONTAINER_ELEMENTS.includes(element.tagName.toLowerCase());
};
const _isGraphicsElement = function (element) {
    return element.tagName && GRAPHICS_ELEMENTS.includes(element.tagName.toLowerCase());
};
const _isPathWithTransformAndStroke = function (element, strokeWidth) {
    if (!element.attributes) return false;
    strokeWidth = element.attributes['stroke-width'] ?
        Number(element.attributes['stroke-width'].value) : Number(strokeWidth);
    return strokeWidth &&
        element.tagName && element.tagName.toLowerCase() === 'path' &&
        element.attributes.d && element.attributes.d.value;
};
const _quadraticMean = function (a, b) {
    return Math.sqrt(((a * a) + (b * b)) / 2);
};

const _createGradient = function (gradientId, svgTag, bbox, matrix) {
    // Adapted from Paper.js's SvgImport.getValue
    const getValue = function (node, name, isString, allowNull, allowPercent, defaultValue) {
        // Interpret value as number. Never return NaN, but 0 instead.
        // If the value is a sequence of numbers, parseFloat will
        // return the first occurring number, which is enough for now.
        let value = SvgElement.get(node, name);
        let res;
        if (value === null) {
            if (defaultValue) {
                res = defaultValue;
                if (/%\s*$/.test(res)) {
                    value = defaultValue;
                    res = parseFloat(value);
                }
            } else if (allowNull) {
                res = null;
            } else if (isString) {
                res = '';
            } else {
                res = 0;
            }
        } else if (isString) {
            res = value;
        } else {
            res = parseFloat(value);
        }
        // Support for dimensions in percentage of the root size. If root-size
        // is not set (e.g. during <defs>), just scale the percentage value to
        // 0..1, as required by gradients with gradientUnits="objectBoundingBox"
        if (/%\s*$/.test(value)) {
            const size = allowPercent ? 1 : bbox[/x|^width/.test(name) ? 'width' : 'height'];
            return res / 100 * size;
        }
        return res;
    };
    const getPoint = function (node, x, y, allowNull, allowPercent, defaultX, defaultY) {
        x = getValue(node, x || 'x', false, allowNull, allowPercent, defaultX);
        y = getValue(node, y || 'y', false, allowNull, allowPercent, defaultY);
        return allowNull && (x === null || y === null) ? null : {x, y};
    };

    let defs = svgTag.getElementsByTagName('defs');
    if (defs.length === 0) {
        defs = SvgElement.create('defs');
        svgTag.appendChild(defs);
    } else {
        defs = defs[0];
    }

    // Clone the old gradient. We'll make a new one, since the gradient might be reused elsewhere
    // with different transform matrix
    const oldGradient = svgTag.getElementById(gradientId);
    if (!oldGradient) return;

    const radial = oldGradient.tagName.toLowerCase() === 'radialgradient';
    const newGradient = svgTag.getElementById(gradientId).cloneNode(true /* deep */);

    // Give the new gradient a new ID
    let matrixString = Matrix.toString(matrix);
    matrixString = matrixString.substring(8, matrixString.length - 1);
    const newGradientId = `${gradientId}-${matrixString}`;
    newGradient.setAttribute('id', newGradientId);

    // This gradient already exists and was transformed before. Just reuse the already-transformed one.
    if (svgTag.getElementById(newGradientId)) {
        // This is the same code as in the end of the function, but I don't feel like wrapping the next 80 lines
        // in an `if (!svgTag.getElementById(newGradientId))` block
        return `url(#${newGradientId})`;
    }

    const scaleToBounds = getValue(newGradient, 'gradientUnits', true) !==
                'userSpaceOnUse';
    let origin;
    let destination;
    let radius;
    let focal;
    if (radial) {
        origin = getPoint(newGradient, 'cx', 'cy', false, scaleToBounds, '50%', '50%');
        radius = getValue(newGradient, 'r', false, false, scaleToBounds, '50%');
        focal = getPoint(newGradient, 'fx', 'fy', true, scaleToBounds);
    } else {
        origin = getPoint(newGradient, 'x1', 'y1', false, scaleToBounds);
        destination = getPoint(newGradient, 'x2', 'y2', false, scaleToBounds, '1');
        if (origin.x === destination.x && origin.y === destination.y) {
            // If it's degenerate, use the color of the last stop, as described by
            // https://www.w3.org/TR/SVG/pservers.html#LinearGradientNotes
            const stops = newGradient.getElementsByTagName('stop');
            if (!stops.length || !stops[stops.length - 1].attributes ||
                    !stops[stops.length - 1].attributes['stop-color']) {
                return null;
            }
            return stops[stops.length - 1].attributes['stop-color'].value;
        }
    }

    // Transform points
    // Emulate SVG's gradientUnits="objectBoundingBox"
    if (scaleToBounds) {
        const boundsMatrix = Matrix.compose(Matrix.translate(bbox.x, bbox.y), Matrix.scale(bbox.width, bbox.height));
        origin = Matrix.applyToPoint(boundsMatrix, origin);
        if (destination) destination = Matrix.applyToPoint(boundsMatrix, destination);
        if (radius) {
            radius = _quadraticMean(bbox.width, bbox.height) * radius;
        }
        if (focal) focal = Matrix.applyToPoint(boundsMatrix, focal);
    }

    if (radial) {
        origin = Matrix.applyToPoint(matrix, origin);
        const matrixScale = _getScaleFactor(matrix);
        radius = _quadraticMean(matrixScale.x, matrixScale.y) * radius;
        if (focal) focal = Matrix.applyToPoint(matrix, focal);
    } else {
        const dot = (a, b) => (a.x * b.x) + (a.y * b.y);
        const multiply = (coefficient, v) => ({x: coefficient * v.x, y: coefficient * v.y});
        const add = (a, b) => ({x: a.x + b.x, y: a.y + b.y});
        const subtract = (a, b) => ({x: a.x - b.x, y: a.y - b.y});

        // The line through origin and gradientPerpendicular is the line at which the gradient starts
        let gradientPerpendicular = Math.abs(origin.x - destination.x) < 1e-8 ?
            add(origin, {x: 1, y: (origin.x - destination.x) / (destination.y - origin.y)}) :
            add(origin, {x: (destination.y - origin.y) / (origin.x - destination.x), y: 1});

        // Transform points
        gradientPerpendicular = Matrix.applyToPoint(matrix, gradientPerpendicular);
        origin = Matrix.applyToPoint(matrix, origin);
        destination = Matrix.applyToPoint(matrix, destination);

        // Calculate the direction that the gradient has changed to
        const originToPerpendicular = subtract(gradientPerpendicular, origin);
        const originToDestination = subtract(destination, origin);
        const gradientDirection = Math.abs(originToPerpendicular.x) < 1e-8 ?
            {x: 1, y: -originToPerpendicular.x / originToPerpendicular.y} :
            {x: -originToPerpendicular.y / originToPerpendicular.x, y: 1};

        // Set the destination so that the gradient moves in the correct direction, by projecting the destination vector
        // onto the gradient direction vector
        const projectionCoeff = dot(originToDestination, gradientDirection) / dot(gradientDirection, gradientDirection);
        const projection = multiply(projectionCoeff, gradientDirection);
        destination = {x: origin.x + projection.x, y: origin.y + projection.y};
    }

    // Put values back into svg
    if (radial) {
        newGradient.setAttribute('cx', Number(origin.x.toFixed(4)));
        newGradient.setAttribute('cy', Number(origin.y.toFixed(4)));
        newGradient.setAttribute('r', Number(radius.toFixed(4)));
        if (focal) {
            newGradient.setAttribute('fx', Number(focal.x.toFixed(4)));
            newGradient.setAttribute('fy', Number(focal.y.toFixed(4)));
        }
    } else {
        newGradient.setAttribute('x1', Number(origin.x.toFixed(4)));
        newGradient.setAttribute('y1', Number(origin.y.toFixed(4)));
        newGradient.setAttribute('x2', Number(destination.x.toFixed(4)));
        newGradient.setAttribute('y2', Number(destination.y.toFixed(4)));
    }
    newGradient.setAttribute('gradientUnits', 'userSpaceOnUse');
    defs.appendChild(newGradient);

    return `url(#${newGradientId})`;
};

// Adapted from paper.js's SvgImport.getDefinition
const _parseUrl = (value, windowRef) => {
    // When url() comes from a style property, '#'' seems to be missing on
    // WebKit. We also get variations of quotes or no quotes, single or
    // double, so handle it all with one regular expression:
    const match = value && value.match(/\((?:["'#]*)([^"')]+)/);
    const name = match && match[1];
    const res = name && windowRef ?
        // This is required by Firefox, which can produce absolute
        // urls for local gradients, see paperjs#1001:
        name.replace(`${windowRef.location.href.split('#')[0]}#`, '') :
        name;
    return res;
};

/**
 * Scratch 2.0 displays stroke widths in a "normalized" way, that is,
 * if a shape with a stroke width has a transform applied, it will be
 * rendered with a stroke that is the same width all the way around,
 * instead of stretched looking.
 *
 * The vector paint editor also prefers to normalize the stroke width,
 * rather than keep track of transforms at the group level, as this
 * simplifies editing (e.g. stroke width 3 always means the same thickness)
 *
 * This function performs that normalization process, pushing transforms
 * on groups down to the leaf level and averaging out the stroke width
 * around the shapes. Note that this doens't just change stroke widths, it
 * changes path data and attributes throughout the SVG.
 *
 * @param {SVGElement} svgTag The SVG dom object
 * @param {Window} windowRef The window to use. Need to pass in for
 *     tests to work, as they get angry at even the mention of window.
 * @param {object} bboxForTesting The bounds to use. Need to pass in for
 *     tests only, because getBBox doesn't work in Node. This should
 *     be the bounds of the svgTag without including stroke width or transforms.
 * @return {void}
 */
const transformStrokeWidths = function (svgTag, windowRef, bboxForTesting) {
    const inherited = Matrix.identity();

    const applyTransforms = (element, matrix, strokeWidth, fill, stroke) => {
        if (_isContainerElement(element)) {
            // Push fills and stroke width down to leaves
            if (element.attributes['stroke-width']) {
                strokeWidth = element.attributes['stroke-width'].value;
            }
            if (element.attributes) {
                if (element.attributes.fill) fill = element.attributes.fill.value;
                if (element.attributes.stroke) stroke = element.attributes.stroke.value;
            }

            // If any child nodes don't take attributes, leave the attributes
            // at the parent level.
            for (let i = 0; i < element.childNodes.length; i++) {
                applyTransforms(
                    element.childNodes[i],
                    Matrix.compose(matrix, _parseTransform(element)),
                    strokeWidth,
                    fill,
                    stroke
                );
            }
            element.removeAttribute('transform');
            element.removeAttribute('stroke-width');
            element.removeAttribute('fill');
            element.removeAttribute('stroke');
        } else if (_isPathWithTransformAndStroke(element, strokeWidth)) {
            if (element.attributes['stroke-width']) {
                strokeWidth = element.attributes['stroke-width'].value;
            }
            if (element.attributes.fill) fill = element.attributes.fill.value;
            if (element.attributes.stroke) stroke = element.attributes.stroke.value;
            matrix = Matrix.compose(matrix, _parseTransform(element));
            if (Matrix.toString(matrix) === Matrix.toString(Matrix.identity())) {
                element.removeAttribute('transform');
                element.setAttribute('stroke-width', strokeWidth);
                if (fill) element.setAttribute('fill', fill);
                if (stroke) element.setAttribute('stroke', stroke);
                return;
            }

            // Transform gradient
            const fillGradientId = _parseUrl(fill, windowRef);
            const strokeGradientId = _parseUrl(stroke, windowRef);

            if (fillGradientId || strokeGradientId) {
                const doc = windowRef.document;
                // Need path bounds to transform gradient
                const svgSpot = doc.createElement('span');
                let bbox;
                if (bboxForTesting) {
                    bbox = bboxForTesting;
                } else {
                    try {
                        doc.body.appendChild(svgSpot);
                        const svg = SvgElement.set(doc.createElementNS(SvgElement.svg, 'svg'));
                        const path = SvgElement.set(doc.createElementNS(SvgElement.svg, 'path'));
                        path.setAttribute('d', element.attributes.d.value);
                        svg.appendChild(path);
                        svgSpot.appendChild(svg);
                        // Take the bounding box.
                        bbox = svg.getBBox();
                    } finally {
                        // Always destroy the element, even if, for example, getBBox throws.
                        doc.body.removeChild(svgSpot);
                    }
                }

                if (fillGradientId) {
                    const newFillRef = _createGradient(fillGradientId, svgTag, bbox, matrix);
                    if (newFillRef) fill = newFillRef;
                }

                if (strokeGradientId) {
                    const newStrokeRef = _createGradient(strokeGradientId, svgTag, bbox, matrix);
                    if (newStrokeRef) stroke = newStrokeRef;
                }
            }

            // Transform path data
            element.setAttribute('d', _transformPath(element.attributes.d.value, matrix));
            element.removeAttribute('transform');

            // Transform stroke width
            const matrixScale = _getScaleFactor(matrix);
            element.setAttribute('stroke-width', _quadraticMean(matrixScale.x, matrixScale.y) * strokeWidth);
            if (fill) element.setAttribute('fill', fill);
            if (stroke) element.setAttribute('stroke', stroke);
        } else if (_isGraphicsElement(element)) {
            // Push stroke width, fill, and stroke down to leaves
            if (strokeWidth && !element.attributes['stroke-width']) {
                element.setAttribute('stroke-width', strokeWidth);
            }
            if (fill && !element.attributes.fill) {
                element.setAttribute('fill', fill);
            }
            if (stroke && !element.attributes.stroke) {
                element.setAttribute('stroke', stroke);
            }

            // Push transform down to leaves
            matrix = Matrix.compose(matrix, _parseTransform(element));
            if (Matrix.toString(matrix) === Matrix.toString(Matrix.identity())) {
                element.removeAttribute('transform');
            } else {
                element.setAttribute('transform', Matrix.toString(matrix));
            }
        }
    };
    applyTransforms(svgTag, inherited, 1 /* default SVG stroke width */);
};

module.exports = transformStrokeWidths;
