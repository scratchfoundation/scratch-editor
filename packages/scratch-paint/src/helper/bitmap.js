import paper from '@scratch/paper';
import {createCanvas, clearRaster, getRaster, hideGuideLayers, showGuideLayers} from './layer';
import {getGuideColor} from './guides';
import {inlineSvgFonts} from 'scratch-svg-renderer';

const forEachLinePoint = function (point1, point2, callback) {
    // Bresenham line algorithm
    let x1 = ~~point1.x;
    const x2 = ~~point2.x;
    let y1 = ~~point1.y;
    const y2 = ~~point2.y;

    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = (x1 < x2) ? 1 : -1;
    const sy = (y1 < y2) ? 1 : -1;
    let err = dx - dy;

    callback(x1, y1);
    while (x1 !== x2 || y1 !== y2) {
        const e2 = err * 2;
        if (e2 > -dy) {
            err -= dy;
            x1 += sx;
        }
        if (e2 < dx) {
            err += dx;
            y1 += sy;
        }
        callback(x1, y1);
    }
};

/**
 * @param {!number} a Coefficient in ax^2 + bx + c = 0
 * @param {!number} b Coefficient in ax^2 + bx + c = 0
 * @param {!number} c Coefficient in ax^2 + bx + c = 0
 * @return {Array<number>} Array of 2 solutions, with the larger solution first
 */
const solveQuadratic_ = function (a, b, c) {
    const soln1 = (-b + Math.sqrt((b * b) - (4 * a * c))) / 2 / a;
    const soln2 = (-b - Math.sqrt((b * b) - (4 * a * c))) / 2 / a;
    return soln1 > soln2 ? [soln1, soln2] : [soln2, soln1];
};

/**
 * @param {!object} options drawing options
 * @param {!number} options.centerX center of ellipse, x
 * @param {!number} options.centerY center of ellipse, y
 * @param {!number} options.radiusX major radius of ellipse
 * @param {!number} options.radiusY minor radius of ellipse
 * @param {!number} options.shearSlope slope of the sheared x axis
 * @param {?boolean} options.isFilled true if isFilled
 * @param {!CanvasRenderingContext2D} context for drawing
 * @return {boolean} true if anything was drawn, false if not
 */
const drawShearedEllipse_ = function (options, context) {
    const centerX = ~~options.centerX;
    const centerY = ~~options.centerY;
    const radiusX = ~~Math.abs(options.radiusX) - .5;
    const radiusY = ~~Math.abs(options.radiusY) - .5;
    const shearSlope = options.shearSlope;
    const isFilled = options.isFilled;
    if (shearSlope === Infinity || radiusX < 1 || radiusY < 1) {
        return false;
    }
    // A, B, and C represent Ax^2 + Bxy + Cy^2 = 1 coefficients in a skewed ellipse formula
    const A = (1 / radiusX / radiusX) + (shearSlope * shearSlope / radiusY / radiusY);
    const B = -2 * shearSlope / radiusY / radiusY;
    const C = 1 / radiusY / radiusY;
    // Line with slope1 intersects the ellipse where its derivative is 1
    const slope1 = ((-2 * A) - B) / ((2 * C) + B);
    // Line with slope2 intersects the ellipse where its derivative is -1
    const slope2 = (-(2 * A) + B) / (-(2 * C) + B);
    const verticalStepsFirst = slope1 > slope2;

    /**
     * Vertical stepping portion of ellipse drawing algorithm
     * @param {!number} startY y to start drawing from
     * @param {!function} conditionFn function which should become true when we should stop stepping
     * @return {object} last point drawn to the canvas, or null if no points drawn
     */
    const drawEllipseStepVertical_ = function (startY, conditionFn) {
        // Points on the ellipse
        let y = startY;
        let x = solveQuadratic_(A, B * y, (C * y * y) - 1);
        // last pixel position at which a draw was performed
        let pY;
        let pX1;
        let pX2;
        while (conditionFn(x[0], y)) {
            pY = Math.floor(y);
            pX1 = Math.floor(x[0]);
            pX2 = Math.floor(x[1]);
            if (isFilled) {
                context.fillRect(centerX - pX1 - 1, centerY + pY, pX1 - pX2 + 1, 1);
                context.fillRect(centerX + pX2, centerY - pY - 1, pX1 - pX2 + 1, 1);
            } else {
                context.fillRect(centerX - pX1 - 1, centerY + pY, 1, 1);
                context.fillRect(centerX + pX1, centerY - pY - 1, 1, 1);
            }
            y--;
            x = solveQuadratic_(A, B * y, (C * y * y) - 1);
        }
        return pX1 || pY ? {x: pX1, y: pY} : null;
    };

    /**
     * Horizontal stepping portion of ellipse drawing algorithm
     * @param {!number} startX x to start drawing from
     * @param {!function} conditionFn function which should become false when we should stop stepping
     * @return {object} last point drawn to the canvas, or null if no points drawn
     */
    const drawEllipseStepHorizontal_ = function (startX, conditionFn) {
        // Points on the ellipse
        let x = startX;
        let y = solveQuadratic_(C, B * x, (A * x * x) - 1);
        // last pixel position at which a draw was performed
        let pX;
        let pY1;
        let pY2;
        while (conditionFn(x, y[0])) {
            pX = Math.floor(x);
            pY1 = Math.floor(y[0]);
            pY2 = Math.floor(y[1]);
            if (isFilled) {
                context.fillRect(centerX - pX - 1, centerY + pY2, 1, pY1 - pY2 + 1);
                context.fillRect(centerX + pX, centerY - pY1 - 1, 1, pY1 - pY2 + 1);
            } else {
                context.fillRect(centerX - pX - 1, centerY + pY1, 1, 1);
                context.fillRect(centerX + pX, centerY - pY1 - 1, 1, 1);
            }
            x++;
            y = solveQuadratic_(C, B * x, (A * x * x) - 1);
        }
        return pX || pY1 ? {x: pX, y: pY1} : null;
    };

    // Last point drawn
    let lastPoint;
    if (verticalStepsFirst) {
        let forwardLeaning = false;
        if (slope1 > 0) forwardLeaning = true;

        // step vertically
        lastPoint = drawEllipseStepVertical_(
            forwardLeaning ? -radiusY : radiusY,
            (x, y) => {
                if (x === 0 && y > 0) return true;
                if (x === 0 && y < 0) return false;
                return y / x > slope1;
            }
        );
        // step horizontally while slope is flat
        lastPoint = drawEllipseStepHorizontal_(
            lastPoint ? -lastPoint.x + .5 : .5,
            (x, y) => y / x > slope2
        ) || {x: -lastPoint.x - .5, y: -lastPoint.y - .5};
        // step vertically until back to start
        drawEllipseStepVertical_(
            lastPoint.y - .5,
            (x, y) => {
                if (forwardLeaning) return y > -radiusY;
                return y > radiusY;
            }
        );
    } else {
        // step horizontally forward
        lastPoint = drawEllipseStepHorizontal_(
            .5,
            (x, y) => y / x > slope2
        );
        // step vertically while slope is steep
        lastPoint = drawEllipseStepVertical_(
            lastPoint ? lastPoint.y - .5 : radiusY,
            (x, y) => {
                if (x === 0 && y > 0) return true;
                if (x === 0 && y < 0) return false;
                return y / x > slope1;
            }
        ) || lastPoint;
        // step horizontally until back to start
        drawEllipseStepHorizontal_(
            -lastPoint.x + .5,
            x => x < 0
        );
    }
    return true;
};

/**
 * Draw an ellipse, given the original axis-aligned radii and
 * an affine transformation. Returns false if the ellipse could
 * not be drawn; for instance, the matrix is non-invertible.
 *
 * @param {!number} positionX Center of ellipse
 * @param {!number} positionY Center of ellipse
 * @param {!number} radiusX x-aligned radius of ellipse
 * @param {!number} radiusY y-aligned radius of ellipse
 * @param {!paper.Matrix} matrix affine transformation matrix
 * @param {?boolean} isFilled true if isFilled
 * @param {!CanvasRenderingContext2D} context for drawing
 * @return {boolean} true if anything was drawn, false if not
 */
const drawEllipse = function (positionX, positionY, radiusX, radiusY, matrix, isFilled, context) {
    if (!matrix.isInvertible()) return false;
    const inverse = matrix.clone().invert();

    // Calculate the ellipse formula
    // A, B, and C represent Ax^2 + Bxy + Cy^2 = 1 coefficients in a transformed ellipse formula
    const A = (inverse.a * inverse.a / radiusX / radiusX) + (inverse.b * inverse.b / radiusY / radiusY);
    const B = (2 * inverse.a * inverse.c / radiusX / radiusX) + (2 * inverse.b * inverse.d / radiusY / radiusY);
    const C = (inverse.c * inverse.c / radiusX / radiusX) + (inverse.d * inverse.d / radiusY / radiusY);

    // Convert to a sheared ellipse formula. All ellipses are equivalent to some sheared axis-aligned ellipse.
    // radiusA, radiusB, and slope are parameters of a skewed ellipse with the above formula
    const radiusB = 1 / Math.sqrt(C);
    const radiusA = Math.sqrt(-4 * C / ((B * B) - (4 * A * C)));
    const slope = B / 2 / C;

    return drawShearedEllipse_({
        centerX: positionX,
        centerY: positionY,
        radiusX: radiusA,
        radiusY: radiusB,
        shearSlope: slope,
        isFilled: isFilled
    }, context);
};

/**
 * @param {!number} size The diameter of the brush
 * @param {!string} color The css color of the brush
 * @param {?boolean} isEraser True if we want the brush mark for the eraser
 * @return {HTMLCanvasElement} a canvas with the brush mark printed on it
 */
const getBrushMark = function (size, color, isEraser) {
    size = ~~size;
    const canvas = document.createElement('canvas');
    const roundedUpRadius = Math.ceil(size / 2);
    canvas.width = roundedUpRadius * 2;
    canvas.height = roundedUpRadius * 2;
    const context = canvas.getContext('2d');
    context.imageSmoothingEnabled = false;
    context.fillStyle = isEraser ? 'white' : color;
    // Small squares for pixel artists
    if (size <= 5) {
        let offset = 0;
        if (size % 2) offset = 1;
        if (isEraser) {
            context.fillStyle = getGuideColor();
            context.fillRect(offset, offset, size, size);
            context.fillStyle = 'white';
            context.fillRect(offset + 1, offset + 1, size - 2, size - 2);
        } else {
            context.fillRect(offset, offset, size, size);
        }
    } else {
        drawShearedEllipse_({
            centerX: size / 2,
            centerY: size / 2,
            radiusX: size / 2,
            radiusY: size / 2,
            shearSlope: 0,
            isFilled: true
        }, context);
        if (isEraser) {
            // Add outline
            context.fillStyle = getGuideColor();
            drawShearedEllipse_({
                centerX: size / 2,
                centerY: size / 2,
                radiusX: size / 2,
                radiusY: size / 2,
                shearSlope: 0,
                isFilled: false
            }, context);
        }
    }
    return canvas;
};

const rowBlank_ = function (imageData, width, y) {
    for (let x = 0; x < width; ++x) {
        if (imageData.data[(y * width << 2) + (x << 2) + 3] !== 0) return false;
    }
    return true;
};

const columnBlank_ = function (imageData, width, x, top, bottom) {
    for (let y = top; y < bottom; ++y) {
        if (imageData.data[(y * width << 2) + (x << 2) + 3] !== 0) return false;
    }
    return true;
};

// Adapted from Tim Down's https://gist.github.com/timdown/021d9c8f2aabc7092df564996f5afbbf
// Get bounds, trimming transparent pixels from edges.
const getHitBounds = function (raster) {
    const width = raster.width;
    const imageData = raster.getImageData(raster.bounds);
    let top = 0;
    let bottom = imageData.height;
    let left = 0;
    let right = imageData.width;

    while (top < bottom && rowBlank_(imageData, width, top)) ++top;
    while (bottom - 1 > top && rowBlank_(imageData, width, bottom - 1)) --bottom;
    while (left < right && columnBlank_(imageData, width, left, top, bottom)) ++left;
    while (right - 1 > left && columnBlank_(imageData, width, right - 1, top, bottom)) --right;

    return new paper.Rectangle(left, top, right - left, bottom - top);
};

const trim_ = function (raster) {
    const hitBounds = getHitBounds(raster);
    if (hitBounds.width && hitBounds.height) {
        return raster.getSubRaster(getHitBounds(raster));
    }
    return null;
};

const convertToBitmap = function (clearSelectedItems, onUpdateImage) {
    // @todo if the active layer contains only rasters, drawing them directly to the raster layer
    // would be more efficient.

    clearSelectedItems();

    // Export svg
    const guideLayers = hideGuideLayers(true /* includeRaster */);
    const bounds = paper.project.activeLayer.bounds;
    const svg = paper.project.exportSVG({
        bounds: 'content',
        matrix: new paper.Matrix().translate(-bounds.x, -bounds.y)
    });
    showGuideLayers(guideLayers);

    // Get rid of anti-aliasing
    // @todo get crisp text https://github.com/LLK/scratch-paint/issues/508
    svg.setAttribute('shape-rendering', 'crispEdges');
    inlineSvgFonts(svg);
    const svgString = (new XMLSerializer()).serializeToString(svg);

    // Put anti-aliased SVG into image, and dump image back into canvas
    const img = new Image();
    img.onload = () => {
        if (img.width && img.height) {
            getRaster().drawImage(
                img,
                new paper.Point(Math.floor(bounds.topLeft.x), Math.floor(bounds.topLeft.y)));
        }
        paper.project.activeLayer.removeChildren();
        onUpdateImage();
    };
    img.onerror = () => {
        // Fallback if browser does not support SVG data URIs in images.
        // The problem with rasterize is that it will anti-alias.
        const raster = paper.project.activeLayer.rasterize(72, false /* insert */);
        raster.onLoad = () => {
            if (raster.canvas.width && raster.canvas.height) {
                getRaster().drawImage(raster.canvas, raster.bounds.topLeft);
            }
            paper.project.activeLayer.removeChildren();
            onUpdateImage();
        };
    };
    // Hash tags will break image loading without being encoded first
    img.src = `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
};

const convertToVector = function (clearSelectedItems, onUpdateImage) {
    clearSelectedItems();
    const trimmedRaster = trim_(getRaster());
    if (trimmedRaster) {
        paper.project.activeLayer.addChild(trimmedRaster);
    }
    clearRaster();
    onUpdateImage();
};

const getColor_ = function (x, y, context) {
    return context.getImageData(x, y, 1, 1).data;
};

const matchesColor_ = function (x, y, imageData, oldColor) {
    const index = ((y * imageData.width) + x) * 4;
    return (
        imageData.data[index + 0] === oldColor[0] &&
        imageData.data[index + 1] === oldColor[1] &&
        imageData.data[index + 2] === oldColor[2] &&
        imageData.data[index + 3 ] === oldColor[3]
    );
};

const colorPixel_ = function (x, y, imageData, newColor) {
    const index = ((y * imageData.width) + x) * 4;
    imageData.data[index + 0] = newColor[0];
    imageData.data[index + 1] = newColor[1];
    imageData.data[index + 2] = newColor[2];
    imageData.data[index + 3] = newColor[3];
};

/**
 * Flood fill beginning at the given point.
 * Based on http://www.williammalone.com/articles/html5-canvas-javascript-paint-bucket-tool/
 *
 * @param {!int} x The x coordinate on the context at which to begin
 * @param {!int} y The y coordinate on the context at which to begin
 * @param {!ImageData} imageData The image data to edit
 * @param {!Array<number>} newColor The color to replace with. A length 4 array [r, g, b, a].
 * @param {!Array<number>} oldColor The color to replace. A length 4 array [r, g, b, a].
 *     This must be different from newColor.
 * @param {!Array<Array<int>>} stack The stack of pixels we need to look at
 */
const floodFillInternal_ = function (x, y, imageData, newColor, oldColor, stack) {
    while (y > 0 && matchesColor_(x, y - 1, imageData, oldColor)) {
        y--;
    }
    let lastLeftMatchedColor = false;
    let lastRightMatchedColor = false;
    for (; y < imageData.height; y++) {
        if (!matchesColor_(x, y, imageData, oldColor)) break;
        colorPixel_(x, y, imageData, newColor);
        if (x > 0) {
            if (matchesColor_(x - 1, y, imageData, oldColor)) {
                if (!lastLeftMatchedColor) {
                    stack.push([x - 1, y]);
                    lastLeftMatchedColor = true;
                }
            } else {
                lastLeftMatchedColor = false;
            }
        }
        if (x < imageData.width - 1) {
            if (matchesColor_(x + 1, y, imageData, oldColor)) {
                if (!lastRightMatchedColor) {
                    stack.push([x + 1, y]);
                    lastRightMatchedColor = true;
                }
            } else {
                lastRightMatchedColor = false;
            }
        }
    }
};

/**
 * Given a fill style string, get the color
 * @param {string} fillStyleString the fill style
 * @return {Array<int>} Color, a length 4 array
 */
const fillStyleToColor_ = function (fillStyleString) {
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = 1;
    tmpCanvas.height = 1;
    const context = tmpCanvas.getContext('2d');
    context.fillStyle = fillStyleString;
    context.fillRect(0, 0, 1, 1);
    return context.getImageData(0, 0, 1, 1).data;
};

/**
 * Flood fill beginning at the given point
 * @param {!number} x The x coordinate on the context at which to begin
 * @param {!number} y The y coordinate on the context at which to begin
 * @param {!string} color A color string, which would go into context.fillStyle
 * @param {!HTMLCanvas2DContext} context The context in which to draw
 * @return {boolean} True if image changed, false otherwise
 */
const floodFill = function (x, y, color, context) {
    x = ~~x;
    y = ~~y;
    const newColor = fillStyleToColor_(color);
    const oldColor = getColor_(x, y, context);
    const imageData = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
    if (oldColor[0] === newColor[0] &&
            oldColor[1] === newColor[1] &&
            oldColor[2] === newColor[2] &&
            oldColor[3] === newColor[3]) { // no-op
        return false;
    }
    const stack = [[x, y]];
    while (stack.length) {
        const pop = stack.pop();
        floodFillInternal_(pop[0], pop[1], imageData, newColor, oldColor, stack);
    }
    context.putImageData(imageData, 0, 0);
    return true;
};

/**
 * Replace all instances of the color at the given point
 * @param {!number} x The x coordinate on the context of the start color
 * @param {!number} y The y coordinate on the context of the start color
 * @param {!string} color A color string, which would go into context.fillStyle
 * @param {!HTMLCanvas2DContext} context The context in which to draw
 * @return {boolean} True if image changed, false otherwise
 */
const floodFillAll = function (x, y, color, context) {
    x = ~~x;
    y = ~~y;
    const newColor = fillStyleToColor_(color);
    const oldColor = getColor_(x, y, context);
    const imageData = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
    if (oldColor[0] === newColor[0] &&
            oldColor[1] === newColor[1] &&
            oldColor[2] === newColor[2] &&
            oldColor[3] === newColor[3]) { // no-op
        return false;
    }
    for (let i = 0; i < imageData.width; i++) {
        for (let j = 0; j < imageData.height; j++) {
            if (matchesColor_(i, j, imageData, oldColor)) {
                colorPixel_(i, j, imageData, newColor);
            }
        }
    }
    context.putImageData(imageData, 0, 0);
    return true;
};

/**
 * @param {!paper.Shape.Rectangle} rect The rectangle to draw to the canvas
 * @param {!HTMLCanvas2DContext} context The context in which to draw
 */
const fillRect = function (rect, context) {
    // No rotation component to matrix
    if (rect.matrix.b === 0 && rect.matrix.c === 0) {
        const width = rect.size.width * rect.matrix.a;
        const height = rect.size.height * rect.matrix.d;
        context.fillRect(
            Math.round(rect.matrix.tx - (width / 2)),
            Math.round(rect.matrix.ty - (height / 2)),
            Math.round(width),
            Math.round(height)
        );
        return;
    }
    const startPoint = rect.matrix.transform(new paper.Point(-rect.size.width / 2, -rect.size.height / 2));
    const widthPoint = rect.matrix.transform(new paper.Point(rect.size.width / 2, -rect.size.height / 2));
    const heightPoint = rect.matrix.transform(new paper.Point(-rect.size.width / 2, rect.size.height / 2));
    const endPoint = rect.matrix.transform(new paper.Point(rect.size.width / 2, rect.size.height / 2));
    const center = rect.matrix.transform(new paper.Point());
    const points = [startPoint, widthPoint, heightPoint, endPoint].sort((a, b) => a.x - b.x);

    const solveY = (point1, point2, x) => {
        if (point2.x === point1.x) return center.x > point1.x ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
        return ((point2.y - point1.y) / (point2.x - point1.x) * (x - point1.x)) + point1.y;
    };
    for (let x = Math.round(points[0].x); x < Math.round(points[3].x); x++) {
        const ys = [
            solveY(startPoint, widthPoint, x + .5),
            solveY(startPoint, heightPoint, x + .5),
            solveY(endPoint, widthPoint, x + .5),
            solveY(endPoint, heightPoint, x + .5)
        ].sort((a, b) => a - b);
        context.fillRect(x, Math.round(ys[1]), 1, Math.max(1, Math.round(ys[2]) - Math.round(ys[1])));
    }
};

const flipBitmapHorizontal = function (canvas) {
    const tmpCanvas = createCanvas(canvas.width, canvas.height);
    const context = tmpCanvas.getContext('2d');
    context.save();
    context.scale(-1, 1);
    context.drawImage(canvas, 0, 0, -tmpCanvas.width, tmpCanvas.height);
    context.restore();
    return tmpCanvas;
};

const flipBitmapVertical = function (canvas) {
    const tmpCanvas = createCanvas(canvas.width, canvas.height);
    const context = tmpCanvas.getContext('2d');
    context.save();
    context.scale(1, -1);
    context.drawImage(canvas, 0, 0, tmpCanvas.width, -tmpCanvas.height);
    context.restore();
    return tmpCanvas;
};

const scaleBitmap = function (canvas, scale) {
    let tmpCanvas = createCanvas(Math.round(canvas.width * Math.abs(scale.x)), canvas.height);
    if (scale.x < 0) {
        canvas = flipBitmapHorizontal(canvas);
    }
    tmpCanvas.getContext('2d').drawImage(canvas, 0, 0, tmpCanvas.width, tmpCanvas.height);
    canvas = tmpCanvas;
    tmpCanvas = createCanvas(canvas.width, Math.round(canvas.height * Math.abs(scale.y)));
    if (scale.y < 0) {
        canvas = flipBitmapVertical(canvas);
    }
    tmpCanvas.getContext('2d').drawImage(canvas, 0, 0, tmpCanvas.width, tmpCanvas.height);
    return tmpCanvas;
};

export {
    convertToBitmap,
    convertToVector,
    fillRect,
    floodFill,
    floodFillAll,
    getBrushMark,
    getHitBounds,
    drawEllipse,
    forEachLinePoint,
    flipBitmapHorizontal,
    flipBitmapVertical,
    scaleBitmap
};
