var RenderWebGL = require('./RenderWebGL');

var Drawable = require('./Drawable');


class RenderWebGLLocal extends RenderWebGL {
    // inherit constructor
}

module.exports = RenderWebGLLocal;


/**
 * Create a new Drawable and add it to the scene.
 * @returns {Promise.<int>} The ID of the new Drawable.
 */
RenderWebGLLocal.prototype.createDrawable = function () {
    var drawableID = this._createDrawable();
    return Promise.resolve(drawableID);
};

/**
 * Destroy a Drawable, removing it from the scene.
 * @param {int} drawableID The ID of the Drawable to remove.
 * @returns {Promise.<Boolean>} True iff the drawable was found and removed.
 */
RenderWebGLLocal.prototype.destroyDrawable = function (drawableID) {
    var wasRemoved = this._destroyDrawable(drawableID);
    return Promise.resolve(wasRemoved);
};

/**
 * Draw all current drawables and present the frame on the canvas.
 */
RenderWebGLLocal.prototype.draw = function () {
    this._draw();
};

/**
 * Check if a particular Drawable is touching a particular color.
 * @param {int} drawableID The ID of the Drawable to check.
 * @param {int[]} color3b Test if the Drawable is touching this color.
 * @param {int[]} [mask3b] Optionally mask the check to this part of Drawable.
 * @returns {Promise.<Boolean>} True iff the Drawable is touching the color.
 */
RenderWebGLLocal.prototype.isTouchingColor = function(
    drawableID, color3b, mask3b) {

    var isTouching = this._isTouchingColor(drawableID, color3b, mask3b);
    return Promise.resolve(isTouching);
};

/**
 * Detect which sprite, if any, is at the given location.
 * @param {int} centerX The client x coordinate of the picking location.
 * @param {int} centerY The client y coordinate of the picking location.
 * @param {int} touchWidth The client width of the touch event (optional).
 * @param {int} touchHeight The client height of the touch event (optional).
 * @param {int[]} candidateIDs The Drawable IDs to pick from, otherwise all.
 * @returns {int} The ID of the topmost Drawable under the picking location, or
 * Drawable.NONE if there is no Drawable at that location.
 */
RenderWebGLLocal.prototype.pick = function (
    centerX, centerY, touchWidth, touchHeight, candidateIDs) {

    var drawableID =
        this._pick(centerX, centerY, touchWidth, touchHeight, candidateIDs);
    return Promise.resolve(drawableID);
};

/**
 * Update the position, direction, scale, or effect properties of this Drawable.
 * @param {int} drawableID The ID of the Drawable to update.
 * @param {Object.<string,*>} properties The new property values to set.
 */
RenderWebGLLocal.prototype.updateDrawableProperties = function (
    drawableID, properties) {

    var drawable = Drawable.getDrawableByID(drawableID);
    drawable.updateProperties(properties);
};
