/**
 * @fileOverview Import bitmap data into Scratch 3.0, resizing image as necessary.
 */

require('jimp/browser/lib/jimp');
const log = require('./util/log');

const STAGE_WIDTH = 480;
const STAGE_HEIGHT = 360;
const STAGE_RATIO = STAGE_WIDTH / STAGE_HEIGHT;

/**
 * Given bitmap data, resize as necessary.
 * @param {ArrayBuffer} bitmapData The image data to decode and manipulate.
 * @param {Function} callback NodeJS style callback function to handle errors
 * or manipulated image buffer
 * @return {void}
 */
const importBitmap = function (bitmapData, callback) {
    // Decode bitmap data and extract size
    return Jimp.read(bitmapData, (err, image) => { // eslint-disable-line no-undef
        if (err) {
            log.warn(`Error reading bitmap data: ${err}.`);
            callback(null, new Uint8Array(bitmapData));
        }

        const imageWidth = image.bitmap.width;
        const imageHeight = image.bitmap.height;

        // If both dimensions are smaller than corresponding stage dimension,
        // double both dimensions
        if ((imageWidth <= STAGE_WIDTH) && (imageHeight <= STAGE_HEIGHT)) {
            image.resize(2 * imageWidth, 2 * imageHeight, Jimp.RESIZE_NEAREST_NEIGHBOR); // eslint-disable-line no-undef
            return image.getBuffer(Jimp.AUTO, callback); // eslint-disable-line no-undef
        }
        const doubleStageW = STAGE_WIDTH * 2;
        const doubleStageH = STAGE_HEIGHT * 2;
        // If neither dimension is larger than 2x corresponding stage dimension,
        // this is an in-between image, return it as is
        const ltDoubleStage = (imageWidth > doubleStageW) || (imageHeight > doubleStageH);
        if (!ltDoubleStage) return image.getBuffer(Jimp.AUTO, callback); // eslint-disable-line no-undef

        const imageRatio = imageWidth / imageHeight;
        // Otherwise, figure out how to resize
        if (imageRatio >= STAGE_RATIO) {
            // Wide Image
            image.resize(doubleStageW, Jimp.AUTO, Jimp.RESIZE_NEAREST_NEIGHBOR); // eslint-disable-line no-undef
        } else {
            // In this case we have either:
            // - A wide image, but not with as big a ratio between width and height,
            // making it so that fitting the width to double stage size would leave
            // the height too big to fit in double the stage height
            // - A square image that's still larger than the double at least
            // one of the stage dimensions, so pick the smaller of the two dimensions (to fit)
            // - A tall image
            // In any of these cases, resize the image to fit the height to double the stage height
            image.resize(Jimp.AUTO, doubleStageH, Jimp.RESIZE_NEAREST_NEIGHBOR); // eslint-disable-line no-undef
        }
        return image.getBuffer(Jimp.AUTO, callback); // eslint-disable-line no-undef
    });
};

module.exports = importBitmap;
