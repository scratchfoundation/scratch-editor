import paper from '@scratch/paper';
import log from '../log/log';
import {ART_BOARD_WIDTH, ART_BOARD_HEIGHT} from './view';

const _getLayer = function (layerString) {
    for (const layer of paper.project.layers) {
        if (layer.data && layer.data[layerString]) {
            return layer;
        }
    }
};

const _getPaintingLayer = function () {
    return _getLayer('isPaintingLayer');
};

/**
 * Creates a canvas with width and height matching the art board size.
 * @param {?number} width Width of the canvas. Defaults to ART_BOARD_WIDTH.
 * @param {?number} height Height of the canvas. Defaults to ART_BOARD_HEIGHT.
 * @return {HTMLCanvasElement} the canvas
 */
const createCanvas = function (width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width ? width : ART_BOARD_WIDTH;
    canvas.height = height ? height : ART_BOARD_HEIGHT;
    canvas.getContext('2d').imageSmoothingEnabled = false;
    return canvas;
};

const clearRaster = function () {
    const layer = _getLayer('isRasterLayer');
    layer.removeChildren();
    
    // Generate blank raster
    const raster = new paper.Raster(createCanvas());
    raster.canvas.getContext('2d').imageSmoothingEnabled = false;
    raster.parent = layer;
    raster.guide = true;
    raster.locked = true;
    raster.position = new paper.Point(ART_BOARD_WIDTH / 2, ART_BOARD_HEIGHT / 2);
};

const getRaster = function () {
    const layer = _getLayer('isRasterLayer');
    // Generate blank raster
    if (layer.children.length === 0) {
        clearRaster();
    }
    return _getLayer('isRasterLayer').children[0];
};

const getBackgroundGuideLayer = function () {
    return _getLayer('isBackgroundGuideLayer');
};

const _makeGuideLayer = function () {
    const guideLayer = new paper.Layer();
    guideLayer.data.isGuideLayer = true;
    return guideLayer;
};

const getGuideLayer = function () {
    let layer = _getLayer('isGuideLayer');
    if (!layer) {
        layer = _makeGuideLayer();
        _getPaintingLayer().activate();
    }
    return layer;
};

/**
 * Removes the guide layers, e.g. for purposes of exporting the image. Must call showGuideLayers to re-add them.
 * @param {boolean} includeRaster true if the raster layer should also be hidden
 * @return {object} an object of the removed layers, which should be passed to showGuideLayers to re-add them.
 */
const hideGuideLayers = function (includeRaster) {
    const backgroundGuideLayer = getBackgroundGuideLayer();
    const guideLayer = getGuideLayer();
    guideLayer.remove();
    backgroundGuideLayer.remove();
    let rasterLayer;
    if (includeRaster) {
        rasterLayer = _getLayer('isRasterLayer');
        rasterLayer.remove();
    }
    return {
        guideLayer: guideLayer,
        backgroundGuideLayer: backgroundGuideLayer,
        rasterLayer: rasterLayer
    };
};

/**
 * Add back the guide layers removed by calling hideGuideLayers. This must be done before any editing operations are
 * taken in the paint editor.
 * @param {!object} guideLayers object of the removed layers, which was returned by hideGuideLayers
 */
const showGuideLayers = function (guideLayers) {
    const backgroundGuideLayer = guideLayers.backgroundGuideLayer;
    const guideLayer = guideLayers.guideLayer;
    const rasterLayer = guideLayers.rasterLayer;
    if (rasterLayer && !rasterLayer.index) {
        paper.project.addLayer(rasterLayer);
        rasterLayer.sendToBack();
    }
    if (!backgroundGuideLayer.index) {
        paper.project.addLayer(backgroundGuideLayer);
        backgroundGuideLayer.sendToBack();
    }
    if (!guideLayer.index) {
        paper.project.addLayer(guideLayer);
        guideLayer.bringToFront();
    }
    if (paper.project.activeLayer !== _getPaintingLayer()) {
        log.error(`Wrong active layer`);
        log.error(paper.project.activeLayer.data);
    }
};

const _makePaintingLayer = function () {
    const paintingLayer = new paper.Layer();
    paintingLayer.data.isPaintingLayer = true;
    return paintingLayer;
};

const _makeRasterLayer = function () {
    const rasterLayer = new paper.Layer();
    rasterLayer.data.isRasterLayer = true;
    clearRaster();
    return rasterLayer;
};

const _makeBackgroundPaper = function (width, height, color) {
    // creates a checkerboard path of width * height squares in color on white
    let x = 0;
    let y = 0;
    const pathPoints = [];
    while (x < width) {
        pathPoints.push(new paper.Point(x, y));
        x++;
        pathPoints.push(new paper.Point(x, y));
        y = y === 0 ? height : 0;
    }
    y = height - 1;
    x = width;
    while (y > 0) {
        pathPoints.push(new paper.Point(x, y));
        x = (x === 0 ? width : 0);
        pathPoints.push(new paper.Point(x, y));
        y--;
    }
    const vRect = new paper.Shape.Rectangle(new paper.Point(0, 0), new paper.Point(120, 90));
    vRect.fillColor = '#fff';
    vRect.guide = true;
    vRect.locked = true;
    const vPath = new paper.Path(pathPoints);
    vPath.fillRule = 'evenodd';
    vPath.fillColor = color;
    vPath.guide = true;
    vPath.locked = true;
    const vGroup = new paper.Group([vRect, vPath]);
    return vGroup;
};

const _makeBackgroundGuideLayer = function () {
    const guideLayer = new paper.Layer();
    guideLayer.locked = true;

    const vBackground = _makeBackgroundPaper(120, 90, '#E5E5E5');
    vBackground.position = new paper.Point(ART_BOARD_WIDTH / 2, ART_BOARD_HEIGHT / 2);
    vBackground.scaling = new paper.Point(8, 8);
    vBackground.guide = true;
    vBackground.locked = true;

    const vLine = new paper.Path.Line(new paper.Point(0, -7), new paper.Point(0, 7));
    vLine.strokeWidth = 2;
    vLine.strokeColor = '#ccc';
    vLine.position = new paper.Point(ART_BOARD_WIDTH / 2, ART_BOARD_HEIGHT / 2);
    vLine.guide = true;
    vLine.locked = true;

    const hLine = new paper.Path.Line(new paper.Point(-7, 0), new paper.Point(7, 0));
    hLine.strokeWidth = 2;
    hLine.strokeColor = '#ccc';
    hLine.position = new paper.Point(ART_BOARD_WIDTH / 2, ART_BOARD_HEIGHT / 2);
    hLine.guide = true;
    hLine.locked = true;

    const circle = new paper.Shape.Circle(new paper.Point(0, 0), 5);
    circle.strokeWidth = 2;
    circle.strokeColor = '#ccc';
    circle.position = new paper.Point(ART_BOARD_WIDTH / 2, ART_BOARD_HEIGHT / 2);
    circle.guide = true;
    circle.locked = true;

    guideLayer.data.isBackgroundGuideLayer = true;
    return guideLayer;
};

const setupLayers = function () {
    const backgroundGuideLayer = _makeBackgroundGuideLayer();
    _makeRasterLayer();
    const paintLayer = _makePaintingLayer();
    const guideLayer = _makeGuideLayer();
    backgroundGuideLayer.sendToBack();
    guideLayer.bringToFront();
    paintLayer.activate();
};

export {
    createCanvas,
    hideGuideLayers,
    showGuideLayers,
    getGuideLayer,
    getBackgroundGuideLayer,
    clearRaster,
    getRaster,
    setupLayers
};
