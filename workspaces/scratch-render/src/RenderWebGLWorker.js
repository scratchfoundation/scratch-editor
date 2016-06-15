
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

RenderWebGLWorker.prototype._getToken = function() {
    return (this._nextToken++) + '';
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

/**
 * Create a new Drawable and add it to the scene.
 * @returns {Promise.<int>} The ID of the new Drawable.
 */
RenderWebGLWorker.prototype.createDrawable = function() {
    var instance = this;
    return new Promise(function (resolve) {
        var token = instance._getToken();
        instance._pendingTokens[token] = resolve;
        self.postMessage({
            id: WorkerMessages.ToRenderer.CreateDrawable,
            token: token
        });
    });
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
