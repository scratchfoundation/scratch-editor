/** @module RenderConstants */
const DEFAULT_SKIN = {
    squirrel: 'https://cdn.assets.scratch.mit.edu/internalapi/asset/7e24c99c1b853e52f8e7f9004416fa34.png/get/',
    bus: 'https://cdn.assets.scratch.mit.edu/internalapi/asset/66895930177178ea01d9e610917f8acf.png/get/',
    scratch_cat: 'https://cdn.assets.scratch.mit.edu/internalapi/asset/09dc888b0b7df19f70d81588ae73420e.svg/get/',
    gradient: 'https://cdn.assets.scratch.mit.edu/internalapi/asset/a49ff276b9b8f997a1ae163992c2c145.png/get/'
}.squirrel;

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
     * The URL to use as the default skin for a Drawable.
     * @todo Remove this in favor of falling back on a built-in skin.
     * @const {string}
     */
    DEFAULT_SKIN: DEFAULT_SKIN,

    /**
     * Optimize for fewer than this number of Drawables sharing the same Skin.
     * Going above this may cause middleware warnings or a performance penalty but should otherwise behave correctly.
     * @const {int}
     */
    SKIN_SHARE_SOFT_LIMIT: 300,

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
