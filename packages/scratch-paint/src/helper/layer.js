import paper from 'paper';

const getGuideLayer = function () {
    for (let i = 0; i < paper.project.layers.length; i++) {
        const layer = paper.project.layers[i];
        if (layer.data && layer.data.isGuideLayer) {
            return layer;
        }
    }

    // Create if it doesn't exist
    const guideLayer = new paper.Layer();
    guideLayer.data.isGuideLayer = true;
    guideLayer.bringToFront();
    return guideLayer;
};

export {getGuideLayer};
