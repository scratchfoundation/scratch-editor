
var WorkerMessages = require('./WorkerMessages');

class RenderWebGLWorker {
    constructor() {
        var instance = this;

        /**
         * Handle a message from this worker's host. Call this from your
         * worker's onmessage function or install it directly.
         * @param {MessageEvent} message The message to be handled.
         */
        this.onmessage = function (message) {
            instance._onmessage(message);
        };

        /**
         * Mapping of message token to Promise resolve function.
         * @type {Object.<string, Promise>}
         * @private
         */
        this._pendingTokens = {};

        this._nextToken = 0;
    }
}

module.exports = RenderWebGLWorker;

/**
 * Create a new Drawable and add it to the scene.
 * @returns {Promise.<int>} The ID of the new Drawable.
 */
RenderWebGLWorker.prototype.createDrawable = function() {
    return this._postForPromise({
        id: WorkerMessages.ToRenderer.CreateDrawable
    });
};

/**
 * Destroy a Drawable, removing it from the scene.
 * @param {int} drawableID The ID of the Drawable to remove.
 * @returns {Promise.<Boolean>} True iff the drawable was found and removed.
 */
RenderWebGLWorker.prototype.destroyDrawable = function (drawableID) {
    return this._postForPromise({
        id: WorkerMessages.ToRenderer.DestroyDrawable,
        drawableID: drawableID
    });
};

/**
 * Draw all current drawables and present the frame on the canvas.
 */
RenderWebGLWorker.prototype.draw = function () {
    self.postMessage({
        id: WorkerMessages.ToRenderer.Draw
    });
};

/**
 * Check if a particular Drawable is touching a particular color.
 * @param {int} drawableID The ID of the Drawable to check.
 * @param {int[]} color3b Test if the Drawable is touching this color.
 * @param {int[]} [mask3b] Optionally mask the check to this part of Drawable.
 * @returns {Promise.<Boolean>} True iff the Drawable is touching the color.
 */
RenderWebGLWorker.prototype.isTouchingColor = function(
    drawableID, color3b, mask3b) {

    var messageData = {
        id: WorkerMessages.ToRenderer.IsTouchingColor,
        drawableID: drawableID,
        color3b: color3b
    };
    if (mask3b != undefined) {
        messageData.mask3b = mask3b;
    }
    return this._postForPromise(messageData);
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
RenderWebGLWorker.prototype.pick = function (
    centerX, centerY, touchWidth, touchHeight, candidateIDs) {

    var messageData = {
        id: WorkerMessages.ToRenderer.Pick,
        centerX: centerX,
        centerY: centerY
    };
    if (touchWidth > 1) {
        messageData.touchWidth = touchWidth;
    }
    if (touchHeight > 1) {
        messageData.touchHeight = touchHeight;
    }
    if (candidateIDs != undefined) {
        messageData.candidateIDs = candidateIDs;
    }
    return this._postForPromise(messageData);
};

/**
 * Update the position, direction, scale, or effect properties of this Drawable.
 * @param {int} drawableID The ID of the Drawable to update.
 * @param {Object.<string,*>} properties The new property values to set.
 */
RenderWebGLWorker.prototype.updateDrawableProperties = function (
    drawableID, properties) {

    self.postMessage({
        id: WorkerMessages.ToRenderer.UpdateDrawableProperties,
        drawableID: drawableID,
        properties: properties
    });
};

/**
 * Retrieve a unique token for use in a message which requests a reply.
 * @returns {string}
 * @private
 */
RenderWebGLWorker.prototype._getToken = function() {
    return (this._nextToken++) + '';
};

/**
 * Post a message to the renderer and return a Promise awaiting the result.
 * WARNING: The messageData object will be modified by this function. The
 * `token` property of messageData will be set to the message's reply token.
 * @param {Object} messageData The contents of the message.
 * @private
 */
RenderWebGLWorker.prototype._postForPromise = function(messageData) {
    var instance = this;
    return new Promise(function (resolve) {
        var token = instance._getToken();
        instance._pendingTokens[token] = resolve;
        messageData.token = token;
        self.postMessage(messageData);
    });
};

/**
 * Actually handle a message from this worker's host.
 * @param {MessageEvent} message The message to be handled.
 * @private
 */
RenderWebGLWorker.prototype._onmessage = function(message) {

    // It's sometimes valid for a message to have no token
    var token = message.data.token;
    if (token != undefined) {
        var resolve = this._pendingTokens[token];
        delete this._pendingTokens[token];
    }

    switch(message.data.id) {
    case WorkerMessages.FromRenderer.ResultValue:
        resolve(message.data.value);
        break;
    }
};
