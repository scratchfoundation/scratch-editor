/** @module RenderConstants */

/**
 * Various constants meant for use throughout the renderer.
 * @enum
 */
module.exports = {
    /**
     * The ID value to use for "no item" or when an object has been disposed.
     * @const {int}
     */
    ID_NONE: -1,

    /**
     * Optimize for fewer than this number of Drawables sharing the same Skin.
     * Going above this may cause middleware warnings or a performance penalty but should otherwise behave correctly.
     * @const {int}
     */
    SKIN_SHARE_SOFT_LIMIT: 301,

    /**
     * @enum {string}
     */
    Events: {
        /**
         * NativeSizeChanged event
         *
         * @event RenderWebGL#event:NativeSizeChanged
         * @type {object}
         * @property {Array<int>} newSize - the new size of the renderer
         */
        NativeSizeChanged: 'NativeSizeChanged'
    }
};
