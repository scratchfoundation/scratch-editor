import paper from '@scratch/paper';
import canvasBg from './background.png';
import log from '../log/log';

const _getLayer = function (layerString) {
    for (const layer of paper.project.layers) {
        if (layer.data && layer.data[layerString]) {
            return layer;
        }
    }
    log.error(`Didn't find layer ${layerString}`);
};

const _getPaintingLayer = function () {
    return _getLayer('isPaintingLayer');
};

const _getBackgroundGuideLayer = function () {
    return _getLayer('isBackgroundGuideLayer');
};

const getGuideLayer = function () {
    return _getLayer('isGuideLayer');
};

/**
 * Removes the guide layers, e.g. for purposes of exporting the image. Must call showGuideLayers to re-add them.
 * @return {object} an object of the removed layers, which should be passed to showGuideLayers to re-add them.
 */
const hideGuideLayers = function () {
    const backgroundGuideLayer = _getBackgroundGuideLayer();
    const guideLayer = getGuideLayer();
    guideLayer.remove();
    backgroundGuideLayer.remove();
    return {
        guideLayer: guideLayer,
        backgroundGuideLayer: backgroundGuideLayer
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

const _makeGuideLayer = function () {
    const guideLayer = new paper.Layer();
    guideLayer.data.isGuideLayer = true;
    return guideLayer;
};

const _makePaintingLayer = function () {
    const paintingLayer = new paper.Layer();
    paintingLayer.data.isPaintingLayer = true;
    return paintingLayer;
};

const _makeBackgroundGuideLayer = function () {
    const guideLayer = new paper.Layer();
    guideLayer.locked = true;
    const img = new Image();
    img.src = canvasBg;
    img.onload = () => {
        const raster = new paper.Raster(img);
        raster.parent = guideLayer;
        raster.guide = true;
        raster.locked = true;
        raster.position = paper.view.center;
        raster.sendToBack();
    };

    const vLine = new paper.Path.Line(new paper.Point(0, -7), new paper.Point(0, 7));
    vLine.strokeWidth = 2;
    vLine.strokeColor = '#ccc';
    vLine.position = paper.view.center;
    vLine.guide = true;
    vLine.locked = true;

    const hLine = new paper.Path.Line(new paper.Point(-7, 0), new paper.Point(7, 0));
    hLine.strokeWidth = 2;
    hLine.strokeColor = '#ccc';
    hLine.position = paper.view.center;
    hLine.guide = true;
    hLine.locked = true;

    const circle = new paper.Shape.Circle(new paper.Point(0, 0), 5);
    circle.strokeWidth = 2;
    circle.strokeColor = '#ccc';
    circle.position = paper.view.center;
    circle.guide = true;
    circle.locked = true;

    guideLayer.data.isBackgroundGuideLayer = true;
    return guideLayer;
};

const setupLayers = function () {
    const backgroundGuideLayer = _makeBackgroundGuideLayer();
    const paintLayer = _makePaintingLayer();
    const guideLayer = _makeGuideLayer();
    backgroundGuideLayer.sendToBack();
    guideLayer.bringToFront();
    paintLayer.activate();
};

export {
    hideGuideLayers,
    showGuideLayers,
    getGuideLayer,
    setupLayers
};
