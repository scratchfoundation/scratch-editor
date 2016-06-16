
/**
 * All messages sent to or from the renderer.
 */
var WorkerMessages = {

    /**
     * Messages that are sent to the renderer from a worker.
     * A message should have this form:
     * postMessage({
     *   id: MessagesToRenderer.ping,
     *   token: 'uniqueString',
     *   ...
     * });
     * If the renderer replies to the message, the 'token' property will be
     * copied into the reply message. If a message generates no reply, the
     * 'token' property is optional.
     * In general these messages correspond to a function on RenderWebGLLocal,
     * and in particular each argument in the RenderWebGLLocal method can be
     * encoded as a property on the message data object with the same name.
     * @enum {string}
     */
    ToRenderer: {
        Ping: 'Ping',
        CreateDrawable: 'CreateDrawable',
        DestroyDrawable: 'DestroyDrawable',
        Draw: 'Draw',
        IsTouchingColor: 'IsTouchingColor',
        Pick: 'Pick',
        UpdateDrawableProperties: 'UpdateDrawableProperties'
    },

    /**
     * Messages that are sent from the renderer to a worker.
     * A message will have this form:
     * postMessage({
     *   id: MessagesFromRenderer.ping,
     *   token: 'uniqueString',
     *   ...
     * });
     * If the message is being sent in reply to another message from the worker,
     * the 'token' property will match the originating message. Otherwise the
     * 'token' property will be undefined.
     * @enum {string}
     */
    FromRenderer: {
        /**
         * The renderer has connected to this worker.
         */
        RendererConnected: 'RendererConnected',

        /**
         * The response to a Ping from a worker.
         */
        Pong: 'Pong',

        /**
         * The message will contain a 'value' field with the result of the
         * request with matching token.
         */
        ResultValue: 'ResultValue'
    }
};

module.exports = WorkerMessages;
