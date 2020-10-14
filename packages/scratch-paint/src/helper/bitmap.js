import paper from '@scratch/paper';
import {createCanvas, clearRaster, getRaster, hideGuideLayers, showGuideLayers} from './layer';
import {getGuideColor} from './guides';
import {clearSelection} from './selection';
import {ART_BOARD_WIDTH, ART_BOARD_HEIGHT, CENTER, MAX_WORKSPACE_BOUNDS} from './view';
import Formats from '../lib/format';
import log from '../log/log';

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
 * @param {?function} options.drawFn The function called on each point in the outline, used only
 *     if isFilled is false.
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
    const drawFn = options.drawFn;
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
                drawFn(centerX - pX1 - 1, centerY + pY);
                drawFn(centerX + pX1, centerY - pY - 1);
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
                drawFn(centerX - pX - 1, centerY + pY1);
                drawFn(centerX + pX, centerY - pY1 - 1);
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
                isFilled: false,
                drawFn: (x, y) => context.fillRect(x, y, 1, 1)
            }, context);
        }
    }
    return canvas;
};

/**
 * Draw an ellipse, given the original axis-aligned radii and
 * an affine transformation. Returns false if the ellipse could
 * not be drawn; for instance, the matrix is non-invertible.
 *
 * @param {!options} options Parameters for the ellipse
 * @param {!paper.Point} options.position Center of ellipse
 * @param {!number} options.radiusX x-aligned radius of ellipse
 * @param {!number} options.radiusY y-aligned radius of ellipse
 * @param {!paper.Matrix} options.matrix affine transformation matrix
 * @param {?boolean} options.isFilled true if isFilled
 * @param {?number} options.thickness Thickness of outline, used only if isFilled is false.
 * @param {!CanvasRenderingContext2D} context for drawing
 * @return {boolean} true if anything was drawn, false if not
 */
const drawEllipse = function (options, context) {
    const positionX = options.position.x;
    const positionY = options.position.y;
    const radiusX = options.radiusX;
    const radiusY = options.radiusY;
    const matrix = options.matrix;
    const isFilled = options.isFilled;
    const thickness = options.thickness;
    let drawFn = null;

    if (!matrix.isInvertible()) return false;
    const inverse = matrix.clone().invert();

    const isGradient = context.fillStyle instanceof CanvasGradient;

    // If drawing a gradient, we need to draw the shape onto a temporary canvas, then draw the gradient atop that canvas
    // only where the shape appears. drawShearedEllipse draws some pixels twice, which would be a problem if the
    // gradient fades to transparent as those pixels would end up looking more opaque. Instead, mask in the gradient.
    // https://github.com/LLK/scratch-paint/issues/1152
    // Outlines are drawn as a series of brush mark images and as such can't be drawn as gradients in the first place.
    let origContext;
    let tmpCanvas;
    const {width: canvasWidth, height: canvasHeight} = context.canvas;
    if (isGradient) {
        tmpCanvas = createCanvas(canvasWidth, canvasHeight);
        origContext = context;
        context = tmpCanvas.getContext('2d');
    }

    if (!isFilled) {
        const brushMark = getBrushMark(thickness, isGradient ? 'black' : context.fillStyle);
        const roundedUpRadius = Math.ceil(thickness / 2);
        drawFn = (x, y) => {
            context.drawImage(brushMark, ~~x - roundedUpRadius, ~~y - roundedUpRadius);
        };
    }

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

    const wasDrawn = drawShearedEllipse_({
        centerX: positionX,
        centerY: positionY,
        radiusX: radiusA,
        radiusY: radiusB,
        shearSlope: slope,
        isFilled: isFilled,
        drawFn: drawFn
    }, context);

    // Mask in the gradient only where the shape was drawn, and draw it. Then draw the gradientified shape onto the
    // original canvas normally.
    if (isGradient && wasDrawn) {
        context.globalCompositeOperation = 'source-in';
        context.fillStyle = origContext.fillStyle;
        context.fillRect(0, 0, canvasWidth, canvasHeight);
        origContext.drawImage(tmpCanvas, 0, 0);
    }

    return wasDrawn;
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

/**
 * Get bounds around the contents of a raster, trimming transparent pixels from edges.
 * Adapted from Tim Down's https://gist.github.com/timdown/021d9c8f2aabc7092df564996f5afbbf
 * @param {paper.Raster} raster The raster to get the bounds around
 * @param {paper.Rectangle} [rect] Optionally, an alternative bounding rectangle to limit the check to.
 * @returns {paper.Rectangle} The bounds around the opaque area of the passed raster
 * (or opaque within the passed rectangle)
 */
const getHitBounds = function (raster, rect) {
    const bounds = rect || raster.bounds;
    const width = bounds.width;
    const imageData = raster.getImageData(bounds);
    let top = 0;
    let bottom = imageData.height;
    let left = 0;
    let right = imageData.width;

    while (top < bottom && rowBlank_(imageData, width, top)) ++top;
    while (bottom - 1 > top && rowBlank_(imageData, width, bottom - 1)) --bottom;
    while (left < right && columnBlank_(imageData, width, left, top, bottom)) ++left;
    while (right - 1 > left && columnBlank_(imageData, width, right - 1, top, bottom)) --right;

    // Center an empty bitmap
    if (top === bottom) {
        top = bottom = imageData.height / 2;
    }
    if (left === right) {
        left = right = imageData.width / 2;
    }

    return new paper.Rectangle(left + bounds.left, top + bounds.top, right - left, bottom - top);
};

const trim_ = function (raster) {
    const hitBounds = getHitBounds(raster);
    if (hitBounds.width && hitBounds.height) {
        return raster.getSubRaster(getHitBounds(raster));
    }
    return null;
};

/**
 * @param {boolean} shouldInsert True if the trimmed raster should be added to the active layer.
 * @returns {paper.Raster} raster layer with whitespace trimmed from ends, or null if there is
 * nothing on the raster layer.
 */
const getTrimmedRaster = function (shouldInsert) {
    const trimmedRaster = trim_(getRaster());
    if (!trimmedRaster) return null;
    if (shouldInsert) {
        paper.project.activeLayer.addChild(trimmedRaster);
    } else {
        trimmedRaster.remove();
    }
    return trimmedRaster;
};

const convertToBitmap = function (clearSelectedItems, onUpdateImage, optFontInlineFn) {
    // @todo if the active layer contains only rasters, drawing them directly to the raster layer
    // would be more efficient.

    clearSelection(clearSelectedItems);

    // Export svg
    const guideLayers = hideGuideLayers(true /* includeRaster */);
    const bounds = paper.project.activeLayer.drawnBounds;
    const svg = paper.project.exportSVG({
        bounds: 'content',
        matrix: new paper.Matrix().translate(-bounds.x, -bounds.y)
    });
    showGuideLayers(guideLayers);

    // Get rid of anti-aliasing
    // @todo get crisp text https://github.com/LLK/scratch-paint/issues/508
    svg.setAttribute('shape-rendering', 'crispEdges');

    let svgString = (new XMLSerializer()).serializeToString(svg);
    if (optFontInlineFn) {
        svgString = optFontInlineFn(svgString);
    } else {
        log.error('Fonts may be converted to bitmap incorrectly if fontInlineFn prop is not set on PaintEditor.');
    }

    // Put anti-aliased SVG into image, and dump image back into canvas
    const img = new Image();
    img.onload = () => {
        if (img.width && img.height) {
            getRaster().drawImage(
                img,
                new paper.Point(Math.floor(bounds.topLeft.x), Math.floor(bounds.topLeft.y)));
        }
        for (let i = paper.project.activeLayer.children.length - 1; i >= 0; i--) {
            const item = paper.project.activeLayer.children[i];
            if (item.clipMask === false) {
                item.remove();
            } else {
                // Resize mask for bitmap bounds
                item.size.height = ART_BOARD_HEIGHT;
                item.size.width = ART_BOARD_WIDTH;
                item.setPosition(CENTER);
            }
        }
        onUpdateImage(false /* skipSnapshot */, Formats.BITMAP /* formatOverride */);
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
            onUpdateImage(false /* skipSnapshot */, Formats.BITMAP /* formatOverride */);
        };
    };
    // Hash tags will break image loading without being encoded first
    img.src = `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
};

const convertToVector = function (clearSelectedItems, onUpdateImage) {
    clearSelection(clearSelectedItems);
    for (const item of paper.project.activeLayer.children) {
        if (item.clipMask === true) {
            // Resize mask for vector bounds
            item.size.height = MAX_WORKSPACE_BOUNDS.height;
            item.size.width = MAX_WORKSPACE_BOUNDS.width;
            item.setPosition(CENTER);
        }
    }
    getTrimmedRaster(true /* shouldInsert */);

    clearRaster();
    onUpdateImage(false /* skipSnapshot */, Formats.VECTOR /* formatOverride */);
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
 * @param {!ImageData} sourceImageData The image data to sample from. This is edited by the function.
 * @param {!ImageData} destImageData The image data to edit. May match sourceImageData. Should match
 *     size of sourceImageData.
 * @param {!Array<number>} newColor The color to replace with. A length 4 array [r, g, b, a].
 * @param {!Array<number>} oldColor The color to replace. A length 4 array [r, g, b, a].
 *     This must be different from newColor.
 * @param {!Array<Array<int>>} stack The stack of pixels we need to look at
 */
const floodFillInternal_ = function (x, y, sourceImageData, destImageData, newColor, oldColor, stack) {
    while (y > 0 && matchesColor_(x, y - 1, sourceImageData, oldColor)) {
        y--;
    }
    let lastLeftMatchedColor = false;
    let lastRightMatchedColor = false;
    for (; y < sourceImageData.height; y++) {
        if (!matchesColor_(x, y, sourceImageData, oldColor)) break;
        colorPixel_(x, y, sourceImageData, newColor);
        colorPixel_(x, y, destImageData, newColor);
        if (x > 0) {
            if (matchesColor_(x - 1, y, sourceImageData, oldColor)) {
                if (!lastLeftMatchedColor) {
                    stack.push([x - 1, y]);
                    lastLeftMatchedColor = true;
                }
            } else {
                lastLeftMatchedColor = false;
            }
        }
        if (x < sourceImageData.width - 1) {
            if (matchesColor_(x + 1, y, sourceImageData, oldColor)) {
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
 * @param {!HTMLCanvas2DContext} sourceContext The context from which to sample to determine where to flood fill
 * @param {!HTMLCanvas2DContext} destContext The context to which to draw. May match sourceContext. Should match
 *     the size of sourceContext.
 * @return {boolean} True if image changed, false otherwise
 */
const floodFill = function (x, y, color, sourceContext, destContext) {
    x = ~~x;
    y = ~~y;
    const newColor = fillStyleToColor_(color);
    const oldColor = getColor_(x, y, sourceContext);
    const sourceImageData = sourceContext.getImageData(0, 0, sourceContext.canvas.width, sourceContext.canvas.height);
    let destImageData = sourceImageData;
    if (destContext !== sourceContext) {
        destImageData = new ImageData(sourceContext.canvas.width, sourceContext.canvas.height);
    }
    if (oldColor[0] === newColor[0] &&
            oldColor[1] === newColor[1] &&
            oldColor[2] === newColor[2] &&
            oldColor[3] === newColor[3]) { // no-op
        return false;
    }
    const stack = [[x, y]];
    while (stack.length) {
        const pop = stack.pop();
        floodFillInternal_(pop[0], pop[1], sourceImageData, destImageData, newColor, oldColor, stack);
    }
    destContext.putImageData(destImageData, 0, 0);
    return true;
};

/**
 * Replace all instances of the color at the given point
 * @param {!number} x The x coordinate on the context of the start color
 * @param {!number} y The y coordinate on the context of the start color
 * @param {!string} color A color string, which would go into context.fillStyle
 * @param {!HTMLCanvas2DContext} sourceContext The context from which to sample to determine where to flood fill
 * @param {!HTMLCanvas2DContext} destContext The context to which to draw. May match sourceContext. Should match
 * @return {boolean} True if image changed, false otherwise
 */
const floodFillAll = function (x, y, color, sourceContext, destContext) {
    x = ~~x;
    y = ~~y;
    const newColor = fillStyleToColor_(color);
    const oldColor = getColor_(x, y, sourceContext);
    const sourceImageData = sourceContext.getImageData(0, 0, sourceContext.canvas.width, sourceContext.canvas.height);
    let destImageData = sourceImageData;
    if (destContext !== sourceContext) {
        destImageData = new ImageData(sourceContext.canvas.width, sourceContext.canvas.height);
    }
    if (oldColor[0] === newColor[0] &&
            oldColor[1] === newColor[1] &&
            oldColor[2] === newColor[2] &&
            oldColor[3] === newColor[3]) { // no-op
        return false;
    }
    for (let i = 0; i < sourceImageData.width; i++) {
        for (let j = 0; j < sourceImageData.height; j++) {
            if (matchesColor_(i, j, sourceImageData, oldColor)) {
                colorPixel_(i, j, destImageData, newColor);
            }
        }
    }
    destContext.putImageData(destImageData, 0, 0);
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

/**
 * @param {!paper.Shape.Rectangle} rect The rectangle to draw to the canvas
 * @param {!number} thickness The thickness of the outline
 * @param {!HTMLCanvas2DContext} context The context in which to draw
 */
const outlineRect = function (rect, thickness, context) {
    const brushMark = getBrushMark(thickness, context.fillStyle);
    const roundedUpRadius = Math.ceil(thickness / 2);
    const drawFn = (x, y) => {
        context.drawImage(brushMark, ~~x - roundedUpRadius, ~~y - roundedUpRadius);
    };

    const isGradient = context.fillStyle instanceof CanvasGradient;

    // If drawing a gradient, we need to draw the shape onto a temporary canvas, then draw the gradient atop that canvas
    // only where the shape appears. Outlines are drawn as a series of brush mark images and as such can't be drawn as
    // gradients.
    let origContext;
    let tmpCanvas;
    const {width: canvasWidth, height: canvasHeight} = context.canvas;
    if (isGradient) {
        tmpCanvas = createCanvas(canvasWidth, canvasHeight);
        origContext = context;
        context = tmpCanvas.getContext('2d');
    }

    const startPoint = rect.matrix.transform(new paper.Point(-rect.size.width / 2, -rect.size.height / 2));
    const widthPoint = rect.matrix.transform(new paper.Point(rect.size.width / 2, -rect.size.height / 2));
    const heightPoint = rect.matrix.transform(new paper.Point(-rect.size.width / 2, rect.size.height / 2));
    const endPoint = rect.matrix.transform(new paper.Point(rect.size.width / 2, rect.size.height / 2));

    forEachLinePoint(startPoint, widthPoint, drawFn);
    forEachLinePoint(startPoint, heightPoint, drawFn);
    forEachLinePoint(endPoint, widthPoint, drawFn);
    forEachLinePoint(endPoint, heightPoint, drawFn);

    // Mask in the gradient only where the shape was drawn, and draw it. Then draw the gradientified shape onto the
    // original canvas normally.
    if (isGradient) {
        context.globalCompositeOperation = 'source-in';
        context.fillStyle = origContext.fillStyle;
        context.fillRect(0, 0, canvasWidth, canvasHeight);
        origContext.drawImage(tmpCanvas, 0, 0);
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

/**
 * Given a raster, take the scale on the transform and apply it to the raster's canvas, then remove
 * the scale from the item's transform matrix. Do this only if scale.x or scale.y is less than 1.
 * @param {paper.Raster} item raster to change
 */
const maybeApplyScaleToCanvas_ = function (item) {
    // context.drawImage will anti-alias the image if both width and height are reduced.
    // However, it will preserve pixel colors if only one or the other is reduced, and
    // imageSmoothingEnabled is set to false. Therefore, we can avoid aliasing by scaling
    // down images in a 2 step process.
    const decomposed = item.matrix.decompose(); // Decomposition order: translate, rotate, scale, skew
    if (Math.abs(decomposed.scaling.x) < 1 && Math.abs(decomposed.scaling.y) < 1 &&
            decomposed.scaling.x !== 0 && decomposed.scaling.y !== 0) {
        item.canvas = scaleBitmap(item.canvas, decomposed.scaling);
        if (item.data && item.data.expanded) {
            item.data.expanded.canvas = scaleBitmap(item.data.expanded.canvas, decomposed.scaling);
        }
        // Remove the scale from the item's matrix
        item.matrix.append(
            new paper.Matrix().scale(new paper.Point(1 / decomposed.scaling.x, 1 / decomposed.scaling.y)));
    }
};

/**
 * Given a raster, apply its transformation matrix to its canvas. Call maybeApplyScaleToCanvas_ first
 * to avoid introducing anti-aliasing to scaled-down rasters.
 * @param {paper.Raster} item raster to resolve transform of
 * @param {paper.Raster} destination raster to draw selection to
 */
const commitArbitraryTransformation_ = function (item, destination) {
    // Create a canvas to perform masking
    const tmpCanvas = createCanvas();
    const context = tmpCanvas.getContext('2d');
    // Draw mask
    const rect = new paper.Shape.Rectangle(new paper.Point(), item.size);
    rect.matrix = item.matrix;
    fillRect(rect, context);
    rect.remove();
    context.globalCompositeOperation = 'source-in';

    // Draw image onto mask
    const m = item.matrix;
    context.transform(m.a, m.b, m.c, m.d, m.tx, m.ty);
    let canvas = item.canvas;
    if (item.data && item.data.expanded) {
        canvas = item.data.expanded.canvas;
    }
    context.transform(1, 0, 0, 1, -canvas.width / 2, -canvas.height / 2);
    context.drawImage(canvas, 0, 0);

    // Draw temp canvas onto raster layer
    destination.drawImage(tmpCanvas, new paper.Point());
};

/**
 * Given a raster item, take its transform matrix and apply it to its canvas. Try to avoid
 * introducing anti-aliasing.
 * @param {paper.Raster} selection raster to resolve transform of
 * @param {paper.Raster} bitmap raster to draw selection to
 */
const commitSelectionToBitmap = function (selection, bitmap) {
    if (!selection.matrix.isInvertible()) {
        return;
    }

    maybeApplyScaleToCanvas_(selection);
    commitArbitraryTransformation_(selection, bitmap);
};

/**
 * Converts a Paper.js color style (an item's fillColor or strokeColor) into a canvas-applicable color style.
 * Note that a "color style" as applied to an item is different from a plain paper.Color or paper.Gradient.
 * For instance, a gradient "color style" has origin and destination points whereas an unattached paper.Gradient
 * does not.
 * @param {paper.Color} color The color to convert to a canvas color/gradient
 * @param {CanvasRenderingContext2D} context The rendering context on which the style will be used
 * @returns {string|CanvasGradient} The canvas fill/stroke style.
 */
const _paperColorToCanvasStyle = function (color, context) {
    if (!color) return null;
    if (color.type === 'gradient') {
        let canvasGradient;
        const {origin, destination} = color;
        if (color.gradient.radial) {
            // Adapted from:
            // https://github.com/paperjs/paper.js/blob/b081fd72c72cd61331313c3961edb48f3dfaffbd/src/style/Color.js#L926-L935
            let {highlight} = color;
            const start = highlight || origin;
            const radius = destination.getDistance(origin);
            if (highlight) {
                const vector = highlight.subtract(origin);
                if (vector.getLength() > radius) {
                    // Paper ¯\_(ツ)_/¯
                    highlight = origin.add(vector.normalize(radius - 0.1));
                }
            }
            canvasGradient = context.createRadialGradient(
                start.x, start.y,
                0,
                origin.x, origin.y,
                radius
            );
        } else {
            canvasGradient = context.createLinearGradient(
                origin.x, origin.y,
                destination.x, destination.y
            );
        }

        const {stops} = color.gradient;
        // Adapted from:
        // https://github.com/paperjs/paper.js/blob/b081fd72c72cd61331313c3961edb48f3dfaffbd/src/style/Color.js#L940-L950
        for (let i = 0, len = stops.length; i < len; i++) {
            const stop = stops[i];
            const offset = stop.offset;
            canvasGradient.addColorStop(
                offset || i / (len - 1),
                stop.color.toCSS()
            );
        }
        return canvasGradient;
    }
    return color.toCSS();
};

/**
 * @param {paper.Shape.Ellipse} oval Vector oval to convert
 * @param {paper.Raster} bitmap raster to draw selection
 * @return {bool} true if the oval was drawn
 */
const commitOvalToBitmap = function (oval, bitmap) {
    const radiusX = Math.abs(oval.size.width / 2);
    const radiusY = Math.abs(oval.size.height / 2);
    const context = bitmap.getContext('2d');
    const filled = oval.strokeWidth === 0;

    const canvasColor = _paperColorToCanvasStyle(filled ? oval.fillColor : oval.strokeColor, context);
    // If the color is null (e.g. fully transparent/"no fill"), don't bother drawing anything
    if (!canvasColor) return;

    context.fillStyle = canvasColor;

    const drew = drawEllipse({
        position: oval.position,
        radiusX,
        radiusY,
        matrix: oval.matrix,
        isFilled: filled,
        thickness: oval.strokeWidth / paper.view.zoom
    }, context);

    return drew;
};

/**
 * @param {paper.Rectangle} rect Vector rectangle to convert
 * @param {paper.Raster} bitmap raster to draw selection to
 */
const commitRectToBitmap = function (rect, bitmap) {
    const tmpCanvas = createCanvas();
    const context = tmpCanvas.getContext('2d');
    const filled = rect.strokeWidth === 0;

    const canvasColor = _paperColorToCanvasStyle(filled ? rect.fillColor : rect.strokeColor, context);
    // If the color is null (e.g. fully transparent/"no fill"), don't bother drawing anything
    if (!canvasColor) return;

    context.fillStyle = canvasColor;

    if (filled) {
        fillRect(rect, context);
    } else {
        outlineRect(rect, rect.strokeWidth / paper.view.zoom, context);
    }
    bitmap.drawImage(tmpCanvas, new paper.Point());
};

const selectAllBitmap = function (clearSelectedItems) {
    clearSelection(clearSelectedItems);

    // Copy trimmed raster to active layer. If the raster layer was empty, nothing is selected.
    const trimmedRaster = getTrimmedRaster(true /* shouldInsert */);
    if (trimmedRaster) {
        trimmedRaster.selected = true;
    }

    // Clear raster layer
    clearRaster();
};

export {
    commitSelectionToBitmap,
    commitOvalToBitmap,
    commitRectToBitmap,
    convertToBitmap,
    convertToVector,
    fillRect,
    outlineRect,
    floodFill,
    floodFillAll,
    getBrushMark,
    getHitBounds,
    getTrimmedRaster,
    drawEllipse,
    forEachLinePoint,
    flipBitmapHorizontal,
    flipBitmapVertical,
    scaleBitmap,
    selectAllBitmap
};
