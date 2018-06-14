import paper from '@scratch/paper';
import {clearRaster, getRaster, hideGuideLayers, showGuideLayers} from '../helper/layer';
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

const fillEllipse = function (centerX, centerY, radiusX, radiusY, context) {
    // Bresenham ellipse algorithm
    centerX = ~~centerX;
    centerY = ~~centerY;
    radiusX = ~~radiusX;
    radiusY = ~~radiusY;
    const twoRadXSquared = 2 * radiusX * radiusX;
    const twoRadYSquared = 2 * radiusY * radiusY;
    let x = radiusX;
    let y = 0;
    let dx = radiusY * radiusY * (1 - (radiusX << 1));
    let dy = radiusX * radiusX;
    let error = 0;
    let stoppingX = twoRadYSquared * radiusX;
    let stoppingY = 0;
 
    while (stoppingX >= stoppingY) {
        context.fillRect(centerX - x, centerY - y, x << 1, y << 1);
        y++;
        stoppingY += twoRadXSquared;
        error += dy;
        dy += twoRadXSquared;
        if ((error << 1) + dx > 0) {
            x--;
            stoppingX -= twoRadYSquared;
            error += dx;
            dx += twoRadYSquared;
        }
    }

    x = 0;
    y = radiusY;
    dx = radiusY * radiusY;
    dy = radiusX * radiusX * (1 - (radiusY << 1));
    error = 0;
    stoppingX = 0;
    stoppingY = twoRadXSquared * radiusY;
    while (stoppingX <= stoppingY) {
        context.fillRect(centerX - x, centerY - y, x * 2, y * 2);
        x++;
        stoppingX += twoRadYSquared;
        error += dx;
        dx += twoRadYSquared;
        if ((error << 1) + dy > 0) {
            y--;
            stoppingY -= twoRadXSquared;
            error += dy;
            dy += twoRadXSquared;
        }

    }
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
    // @todo add outline for erasers
    // Small squares for pixel artists
    if (size <= 5) {
        if (size % 2) {
            context.fillRect(1, 1, size, size);
        } else {
            context.fillRect(0, 0, size, size);
        }
    } else {
        const roundedDownRadius = ~~(size / 2);
        fillEllipse(roundedDownRadius, roundedDownRadius, roundedDownRadius, roundedDownRadius, context);
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
    // @todo get crisp text?
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
 * Flood fill beginning at the given point
 * @param {!int} x The x coordinate on the context at which to begin
 * @param {!int} y The y coordinate on the context at which to begin
 * @param {!HTMLCanvas2DContext} context The context in which to draw
 */
const floodFill = function (x, y, context) {
    const oldColor = getColor_(x, y, context);
    context.fillRect(x, y, 1, 1);
    const newColor = getColor_(x, y, context);
    const imageData = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
    if (matchesColor_(x, y, imageData, oldColor)) { // no-op
        return;
    }
    colorPixel_(x, y, imageData, newColor); // Restore old color to avoid affecting result
    const stack = [[x, y]];
    while (stack.length) {
        const pop = stack.pop();
        floodFillInternal_(pop[0], pop[1], imageData, newColor, oldColor, stack);
    }
    context.putImageData(imageData, 0, 0);
};

/**
 * @param {!paper.Shape.Rectangle} rect The rectangle to draw to the canvas
 * @param {!HTMLCanvas2DContext} context The context in which to draw
 */
const drawRect = function (rect, context) {
    // No rotation component to matrix
    if (rect.matrix.b === 0 && rect.matrix.c === 0) {
        const width = rect.size.width * rect.matrix.a;
        const height = rect.size.height * rect.matrix.d;
        context.fillRect(
            ~~(rect.matrix.tx - (width / 2)),
            ~~(rect.matrix.ty - (height / 2)),
            ~~width,
            ~~height);
        return;
    }
    const startPoint = rect.matrix.transform(new paper.Point(-rect.size.width / 2, -rect.size.height / 2));
    const widthPoint = rect.matrix.transform(new paper.Point(rect.size.width / 2, -rect.size.height / 2));
    const heightPoint = rect.matrix.transform(new paper.Point(-rect.size.width / 2, rect.size.height / 2));
    const endPoint = rect.matrix.transform(new paper.Point(rect.size.width / 2, rect.size.height / 2));
    const center = rect.matrix.transform(new paper.Point());
    forEachLinePoint(startPoint, widthPoint, (x, y) => {
        context.fillRect(x, y, 1, 1);
    });
    forEachLinePoint(startPoint, heightPoint, (x, y) => {
        context.fillRect(x, y, 1, 1);
    });
    forEachLinePoint(endPoint, widthPoint, (x, y) => {
        context.fillRect(x, y, 1, 1);
    });
    forEachLinePoint(endPoint, heightPoint, (x, y) => {
        context.fillRect(x, y, 1, 1);
    });
    floodFill(~~center.x, ~~center.y, context);
};

export {
    convertToBitmap,
    convertToVector,
    drawRect,
    getBrushMark,
    getHitBounds,
    fillEllipse,
    forEachLinePoint
};
