const EventEmitter = require('events');

const hull = require('hull.js');
const twgl = require('twgl.js');

const BitmapSkin = require('./BitmapSkin');
const Drawable = require('./Drawable');
const Rectangle = require('./Rectangle');
const PenSkin = require('./PenSkin');
const RenderConstants = require('./RenderConstants');
const ShaderManager = require('./ShaderManager');
const SVGSkin = require('./SVGSkin');
const TextBubbleSkin = require('./TextBubbleSkin');
const EffectTransform = require('./EffectTransform');
const log = require('./util/log');

const __isTouchingDrawablesPoint = twgl.v3.create();
const __candidatesBounds = new Rectangle();
const __fenceBounds = new Rectangle();
const __touchingColor = new Uint8ClampedArray(4);
const __blendColor = new Uint8ClampedArray(4);

// More pixels than this and we give up to the GPU and take the cost of readPixels
// Width * Height * Number of drawables at location
const __cpuTouchingColorPixelCount = 4e4;

/**
 * @callback RenderWebGL#idFilterFunc
 * @param {int} drawableID The ID to filter.
 * @return {bool} True if the ID passes the filter, otherwise false.
 */

/**
 * Maximum touch size for a picking check.
 * @todo Figure out a reasonable max size. Maybe this should be configurable?
 * @type {Array<int>}
 * @memberof RenderWebGL
 */
const MAX_TOUCH_SIZE = [3, 3];

/**
 * Passed to the uniforms for mask in touching color
 */
const MASK_TOUCHING_COLOR_TOLERANCE = 2;

/**
 * Maximum number of pixels in either dimension of "extracted drawable" data
 * @type {int}
 */
const MAX_EXTRACTED_DRAWABLE_DIMENSION = 2048;

/**
 * Determines if the mask color is "close enough" (only test the 6 top bits for
 * each color).  These bit masks are what scratch 2 used to use, so we do the same.
 * @param {Uint8Array} a A color3b or color4b value.
 * @param {Uint8Array} b A color3b or color4b value.
 * @returns {boolean} If the colors match within the parameters.
 */
const maskMatches = (a, b) => (
    // has some non-alpha component to test against
    a[3] > 0 &&
    (a[0] & 0b11111100) === (b[0] & 0b11111100) &&
    (a[1] & 0b11111100) === (b[1] & 0b11111100) &&
    (a[2] & 0b11111100) === (b[2] & 0b11111100)
);

/**
 * Determines if the given color is "close enough" (only test the 5 top bits for
 * red and green, 4 bits for blue).  These bit masks are what scratch 2 used to use,
 * so we do the same.
 * @param {Uint8Array} a A color3b or color4b value.
 * @param {Uint8Array} b A color3b or color4b value / or a larger array when used with offsets
 * @param {number} offset An offset into the `b` array, which lets you use a larger array to test
 *                  multiple values at the same time.
 * @returns {boolean} If the colors match within the parameters.
 */
const colorMatches = (a, b, offset) => (
    (a[0] & 0b11111000) === (b[offset + 0] & 0b11111000) &&
    (a[1] & 0b11111000) === (b[offset + 1] & 0b11111000) &&
    (a[2] & 0b11110000) === (b[offset + 2] & 0b11110000)
);

/**
 * Sprite Fencing - The number of pixels a sprite is required to leave remaining
 * onscreen around the edge of the staging area.
 * @type {number}
 */
const FENCE_WIDTH = 15;


class RenderWebGL extends EventEmitter {
    /**
     * Check if this environment appears to support this renderer before attempting to create an instance.
     * Catching an exception from the constructor is also a valid way to test for (lack of) support.
     * @param {canvas} [optCanvas] - An optional canvas to use for the test. Otherwise a temporary canvas will be used.
     * @returns {boolean} - True if this environment appears to support this renderer, false otherwise.
     */
    static isSupported (optCanvas) {
        try {
            // Create the context the same way that the constructor will: attributes may make the difference.
            return !!RenderWebGL._getContext(optCanvas || document.createElement('canvas'));
        } catch (e) {
            return false;
        }
    }

    /**
     * Ask TWGL to create a rendering context with the attributes used by this renderer.
     * @param {canvas} canvas - attach the context to this canvas.
     * @returns {WebGLRenderingContext} - a TWGL rendering context (backed by either WebGL 1.0 or 2.0).
     * @private
     */
    static _getContext (canvas) {
        const contextAttribs = {alpha: false, stencil: true, antialias: false};
        // getWebGLContext = try WebGL 1.0 only
        // getContext = try WebGL 2.0 and if that doesn't work, try WebGL 1.0
        // getWebGLContext || getContext = try WebGL 1.0 and if that doesn't work, try WebGL 2.0
        return twgl.getWebGLContext(canvas, contextAttribs) ||
            twgl.getContext(canvas, contextAttribs);
    }

    /**
     * Create a renderer for drawing Scratch sprites to a canvas using WebGL.
     * Coordinates will default to Scratch 2.0 values if unspecified.
     * The stage's "native" size will be calculated from the these coordinates.
     * For example, the defaults result in a native size of 480x360.
     * Queries such as "touching color?" will always execute at the native size.
     * @see RenderWebGL#setStageSize
     * @see RenderWebGL#resize
     * @param {canvas} canvas The canvas to draw onto.
     * @param {int} [xLeft=-240] The x-coordinate of the left edge.
     * @param {int} [xRight=240] The x-coordinate of the right edge.
     * @param {int} [yBottom=-180] The y-coordinate of the bottom edge.
     * @param {int} [yTop=180] The y-coordinate of the top edge.
     * @constructor
     * @listens RenderWebGL#event:NativeSizeChanged
     */
    constructor (canvas, xLeft, xRight, yBottom, yTop) {
        super();

        /** @type {WebGLRenderingContext} */
        const gl = this._gl = RenderWebGL._getContext(canvas);
        if (!gl) {
            throw new Error('Could not get WebGL context: this browser or environment may not support WebGL.');
        }

        /** @type {RenderWebGL.UseGpuModes} */
        this._useGpuMode = RenderWebGL.UseGpuModes.Automatic;

        /** @type {Drawable[]} */
        this._allDrawables = [];

        /** @type {Skin[]} */
        this._allSkins = [];

        /** @type {Array<int>} */
        this._drawList = [];

        // A list of layer group names in the order they should appear
        // from furthest back to furthest in front.
        /** @type {Array<String>} */
        this._groupOrdering = [];

        /**
         * @typedef LayerGroup
         * @property {int} groupIndex The relative position of this layer group in the group ordering
         * @property {int} drawListOffset The absolute position of this layer group in the draw list
         * This number gets updated as drawables get added to or deleted from the draw list.
         */

        // Map of group name to layer group
        /** @type {Object.<string, LayerGroup>} */
        this._layerGroups = {};

        /** @type {int} */
        this._nextDrawableId = RenderConstants.ID_NONE + 1;

        /** @type {int} */
        this._nextSkinId = RenderConstants.ID_NONE + 1;

        /** @type {module:twgl/m4.Mat4} */
        this._projection = twgl.m4.identity();

        /** @type {ShaderManager} */
        this._shaderManager = new ShaderManager(gl);

        /** @type {HTMLCanvasElement} */
        this._tempCanvas = document.createElement('canvas');

        /** @type {any} */
        this._regionId = null;

        /** @type {function} */
        this._exitRegion = null;

        /** @type {object} */
        this._backgroundDrawRegionId = {
            enter: () => this._enterDrawBackground(),
            exit: () => this._exitDrawBackground()
        };

        /** @type {Array.<snapshotCallback>} */
        this._snapshotCallbacks = [];

        /** @type {Array<number>} */
        // Don't set this directly-- use setBackgroundColor so it stays in sync with _backgroundColor3b
        this._backgroundColor4f = [0, 0, 0, 1];

        /** @type {Uint8ClampedArray} */
        // Don't set this directly-- use setBackgroundColor so it stays in sync with _backgroundColor4f
        this._backgroundColor3b = new Uint8ClampedArray(3);

        this._createGeometry();

        this.on(RenderConstants.Events.NativeSizeChanged, this.onNativeSizeChanged);

        this.setBackgroundColor(1, 1, 1);
        this.setStageSize(xLeft || -240, xRight || 240, yBottom || -180, yTop || 180);
        this.resize(this._nativeSize[0], this._nativeSize[1]);

        gl.disable(gl.DEPTH_TEST);
        /** @todo disable when no partial transparency? */
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    }

    /**
     * @returns {WebGLRenderingContext} the WebGL rendering context associated with this renderer.
     */
    get gl () {
        return this._gl;
    }

    /**
     * @returns {HTMLCanvasElement} the canvas of the WebGL rendering context associated with this renderer.
     */
    get canvas () {
        return this._gl && this._gl.canvas;
    }

    /**
     * Set the physical size of the stage in device-independent pixels.
     * This will be multiplied by the device's pixel ratio on high-DPI displays.
     * @param {int} pixelsWide The desired width in device-independent pixels.
     * @param {int} pixelsTall The desired height in device-independent pixels.
     */
    resize (pixelsWide, pixelsTall) {
        const {canvas} = this._gl;
        const pixelRatio = window.devicePixelRatio || 1;
        const newWidth = pixelsWide * pixelRatio;
        const newHeight = pixelsTall * pixelRatio;

        // Certain operations, such as moving the color picker, call `resize` once per frame, even though the canvas
        // size doesn't change. To avoid unnecessary canvas updates, check that we *really* need to resize the canvas.
        if (canvas.width !== newWidth || canvas.height !== newHeight) {
            canvas.width = newWidth;
            canvas.height = newHeight;
            // Resizing the canvas causes it to be cleared, so redraw it.
            this.draw();
        }

    }

    /**
     * Set the background color for the stage. The stage will be cleared with this
     * color each frame.
     * @param {number} red The red component for the background.
     * @param {number} green The green component for the background.
     * @param {number} blue The blue component for the background.
     */
    setBackgroundColor (red, green, blue) {
        this._backgroundColor4f[0] = red;
        this._backgroundColor4f[1] = green;
        this._backgroundColor4f[2] = blue;

        this._backgroundColor3b[0] = red * 255;
        this._backgroundColor3b[1] = green * 255;
        this._backgroundColor3b[2] = blue * 255;

    }

    /**
     * Tell the renderer to draw various debug information to the provided canvas
     * during certain operations.
     * @param {canvas} canvas The canvas to use for debug output.
     */
    setDebugCanvas (canvas) {
        this._debugCanvas = canvas;
    }

    /**
     * Control the use of the GPU or CPU paths in `isTouchingColor`.
     * @param {RenderWebGL.UseGpuModes} useGpuMode - automatically decide, force CPU, or force GPU.
     */
    setUseGpuMode (useGpuMode) {
        this._useGpuMode = useGpuMode;
    }

    /**
     * Set logical size of the stage in Scratch units.
     * @param {int} xLeft The left edge's x-coordinate. Scratch 2 uses -240.
     * @param {int} xRight The right edge's x-coordinate. Scratch 2 uses 240.
     * @param {int} yBottom The bottom edge's y-coordinate. Scratch 2 uses -180.
     * @param {int} yTop The top edge's y-coordinate. Scratch 2 uses 180.
     */
    setStageSize (xLeft, xRight, yBottom, yTop) {
        this._xLeft = xLeft;
        this._xRight = xRight;
        this._yBottom = yBottom;
        this._yTop = yTop;

        // swap yBottom & yTop to fit Scratch convention of +y=up
        this._projection = twgl.m4.ortho(xLeft, xRight, yBottom, yTop, -1, 1);

        this._setNativeSize(Math.abs(xRight - xLeft), Math.abs(yBottom - yTop));
    }

    /**
     * @return {Array<int>} the "native" size of the stage, which is used for pen, query renders, etc.
     */
    getNativeSize () {
        return [this._nativeSize[0], this._nativeSize[1]];
    }

    /**
     * Set the "native" size of the stage, which is used for pen, query renders, etc.
     * @param {int} width - the new width to set.
     * @param {int} height - the new height to set.
     * @private
     * @fires RenderWebGL#event:NativeSizeChanged
     */
    _setNativeSize (width, height) {
        this._nativeSize = [width, height];
        this.emit(RenderConstants.Events.NativeSizeChanged, {newSize: this._nativeSize});
    }

    /**
     * Create a new bitmap skin from a snapshot of the provided bitmap data.
     * @param {ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement} bitmapData - new contents for this skin.
     * @param {!int} [costumeResolution=1] - The resolution to use for this bitmap.
     * @param {?Array<number>} [rotationCenter] Optional: rotation center of the skin. If not supplied, the center of
     * the skin will be used.
     * @returns {!int} the ID for the new skin.
     */
    createBitmapSkin (bitmapData, costumeResolution, rotationCenter) {
        const skinId = this._nextSkinId++;
        const newSkin = new BitmapSkin(skinId, this);
        newSkin.setBitmap(bitmapData, costumeResolution, rotationCenter);
        this._allSkins[skinId] = newSkin;
        return skinId;
    }

    /**
     * Create a new SVG skin.
     * @param {!string} svgData - new SVG to use.
     * @param {?Array<number>} rotationCenter Optional: rotation center of the skin. If not supplied, the center of the
     * skin will be used
     * @returns {!int} the ID for the new skin.
     */
    createSVGSkin (svgData, rotationCenter) {
        const skinId = this._nextSkinId++;
        const newSkin = new SVGSkin(skinId, this);
        newSkin.setSVG(svgData, rotationCenter);
        this._allSkins[skinId] = newSkin;
        return skinId;
    }

    /**
     * Create a new PenSkin - a skin which implements a Scratch pen layer.
     * @returns {!int} the ID for the new skin.
     */
    createPenSkin () {
        const skinId = this._nextSkinId++;
        const newSkin = new PenSkin(skinId, this);
        this._allSkins[skinId] = newSkin;
        return skinId;
    }

    /**
     * Create a new SVG skin using the text bubble svg creator. The rotation center
     * is always placed at the top left.
     * @param {!string} type - either "say" or "think".
     * @param {!string} text - the text for the bubble.
     * @param {!boolean} pointsLeft - which side the bubble is pointing.
     * @returns {!int} the ID for the new skin.
     */
    createTextSkin (type, text, pointsLeft) {
        const skinId = this._nextSkinId++;
        const newSkin = new TextBubbleSkin(skinId, this);
        newSkin.setTextBubble(type, text, pointsLeft);
        this._allSkins[skinId] = newSkin;
        return skinId;
    }

    /**
     * Update an existing SVG skin, or create an SVG skin if the previous skin was not SVG.
     * @param {!int} skinId the ID for the skin to change.
     * @param {!string} svgData - new SVG to use.
     * @param {?Array<number>} rotationCenter Optional: rotation center of the skin. If not supplied, the center of the
     * skin will be used
     */
    updateSVGSkin (skinId, svgData, rotationCenter) {
        if (this._allSkins[skinId] instanceof SVGSkin) {
            this._allSkins[skinId].setSVG(svgData, rotationCenter);
            return;
        }

        const newSkin = new SVGSkin(skinId, this);
        newSkin.setSVG(svgData, rotationCenter);
        this._reskin(skinId, newSkin);
    }

    /**
     * Update an existing bitmap skin, or create a bitmap skin if the previous skin was not bitmap.
     * @param {!int} skinId the ID for the skin to change.
     * @param {!ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement} imgData - new contents for this skin.
     * @param {!number} bitmapResolution - the resolution scale for a bitmap costume.
     * @param {?Array<number>} rotationCenter Optional: rotation center of the skin. If not supplied, the center of the
     * skin will be used
     */
    updateBitmapSkin (skinId, imgData, bitmapResolution, rotationCenter) {
        if (this._allSkins[skinId] instanceof BitmapSkin) {
            this._allSkins[skinId].setBitmap(imgData, bitmapResolution, rotationCenter);
            return;
        }

        const newSkin = new BitmapSkin(skinId, this);
        newSkin.setBitmap(imgData, bitmapResolution, rotationCenter);
        this._reskin(skinId, newSkin);
    }

    _reskin (skinId, newSkin) {
        const oldSkin = this._allSkins[skinId];
        this._allSkins[skinId] = newSkin;

        // Tell drawables to update
        for (const drawable of this._allDrawables) {
            if (drawable && drawable.skin === oldSkin) {
                drawable.skin = newSkin;
            }
        }
        oldSkin.dispose();
    }

    /**
     * Update a skin using the text bubble svg creator.
     * @param {!int} skinId the ID for the skin to change.
     * @param {!string} type - either "say" or "think".
     * @param {!string} text - the text for the bubble.
     * @param {!boolean} pointsLeft - which side the bubble is pointing.
     */
    updateTextSkin (skinId, type, text, pointsLeft) {
        if (this._allSkins[skinId] instanceof TextBubbleSkin) {
            this._allSkins[skinId].setTextBubble(type, text, pointsLeft);
            return;
        }

        const newSkin = new TextBubbleSkin(skinId, this);
        newSkin.setTextBubble(type, text, pointsLeft);
        this._reskin(skinId, newSkin);
    }


    /**
     * Destroy an existing skin. Do not use the skin or its ID after calling this.
     * @param {!int} skinId - The ID of the skin to destroy.
     */
    destroySkin (skinId) {
        const oldSkin = this._allSkins[skinId];
        oldSkin.dispose();
        delete this._allSkins[skinId];
    }

    /**
     * Create a new Drawable and add it to the scene.
     * @param {string} group Layer group to add the drawable to
     * @returns {int} The ID of the new Drawable.
     */
    createDrawable (group) {
        if (!group || !Object.prototype.hasOwnProperty.call(this._layerGroups, group)) {
            log.warn('Cannot create a drawable without a known layer group');
            return;
        }
        const drawableID = this._nextDrawableId++;
        const drawable = new Drawable(drawableID);
        this._allDrawables[drawableID] = drawable;
        this._addToDrawList(drawableID, group);

        drawable.skin = null;

        return drawableID;
    }

    /**
     * Set the layer group ordering for the renderer.
     * @param {Array<string>} groupOrdering The ordered array of layer group
     * names
     */
    setLayerGroupOrdering (groupOrdering) {
        this._groupOrdering = groupOrdering;
        for (let i = 0; i < this._groupOrdering.length; i++) {
            this._layerGroups[this._groupOrdering[i]] = {
                groupIndex: i,
                drawListOffset: 0
            };
        }
    }

    _addToDrawList (drawableID, group) {
        const currentLayerGroup = this._layerGroups[group];
        const currentGroupOrderingIndex = currentLayerGroup.groupIndex;

        const drawListOffset = this._endIndexForKnownLayerGroup(currentLayerGroup);
        this._drawList.splice(drawListOffset, 0, drawableID);

        this._updateOffsets('add', currentGroupOrderingIndex);
    }

    _updateOffsets (updateType, currentGroupOrderingIndex) {
        for (let i = currentGroupOrderingIndex + 1; i < this._groupOrdering.length; i++) {
            const laterGroupName = this._groupOrdering[i];
            if (updateType === 'add') {
                this._layerGroups[laterGroupName].drawListOffset++;
            } else if (updateType === 'delete'){
                this._layerGroups[laterGroupName].drawListOffset--;
            }
        }
    }

    get _visibleDrawList () {
        return this._drawList.filter(id => this._allDrawables[id]._visible);
    }

    // Given a layer group, return the index where it ends (non-inclusive),
    // e.g. the returned index does not have a drawable from this layer group in it)
    _endIndexForKnownLayerGroup (layerGroup) {
        const groupIndex = layerGroup.groupIndex;
        if (groupIndex === this._groupOrdering.length - 1) {
            return this._drawList.length;
        }
        return this._layerGroups[this._groupOrdering[groupIndex + 1]].drawListOffset;
    }

    /**
     * Destroy a Drawable, removing it from the scene.
     * @param {int} drawableID The ID of the Drawable to remove.
     * @param {string} group Group name that the drawable belongs to
     */
    destroyDrawable (drawableID, group) {
        if (!group || !Object.prototype.hasOwnProperty.call(this._layerGroups, group)) {
            log.warn('Cannot destroy drawable without known layer group.');
            return;
        }
        const drawable = this._allDrawables[drawableID];
        drawable.dispose();
        delete this._allDrawables[drawableID];

        const currentLayerGroup = this._layerGroups[group];
        const endIndex = this._endIndexForKnownLayerGroup(currentLayerGroup);

        let index = currentLayerGroup.drawListOffset;
        while (index < endIndex) {
            if (this._drawList[index] === drawableID) {
                break;
            }
            index++;
        }
        if (index < endIndex) {
            this._drawList.splice(index, 1);
            this._updateOffsets('delete', currentLayerGroup.groupIndex);
        } else {
            log.warn('Could not destroy drawable that could not be found in layer group.');
            return;
        }
    }

    /**
     * Returns the position of the given drawableID in the draw list. This is
     * the absolute position irrespective of layer group.
     * @param {number} drawableID The drawable ID to find.
     * @return {number} The postion of the given drawable ID.
     */
    getDrawableOrder (drawableID) {
        return this._drawList.indexOf(drawableID);
    }

    /**
     * Set a drawable's order in the drawable list (effectively, z/layer).
     * Can be used to move drawables to absolute positions in the list,
     * or relative to their current positions.
     * "go back N layers": setDrawableOrder(id, -N, true, 1); (assuming stage at 0).
     * "go to back": setDrawableOrder(id, 1); (assuming stage at 0).
     * "go to front": setDrawableOrder(id, Infinity);
     * @param {int} drawableID ID of Drawable to reorder.
     * @param {number} order New absolute order or relative order adjusment.
     * @param {string=} group Name of layer group drawable belongs to.
     * Reordering will not take place if drawable cannot be found within the bounds
     * of the layer group.
     * @param {boolean=} optIsRelative If set, `order` refers to a relative change.
     * @param {number=} optMin If set, order constrained to be at least `optMin`.
     * @return {?number} New order if changed, or null.
     */
    setDrawableOrder (drawableID, order, group, optIsRelative, optMin) {
        if (!group || !Object.prototype.hasOwnProperty.call(this._layerGroups, group)) {
            log.warn('Cannot set the order of a drawable without a known layer group.');
            return;
        }

        const currentLayerGroup = this._layerGroups[group];
        const startIndex = currentLayerGroup.drawListOffset;
        const endIndex = this._endIndexForKnownLayerGroup(currentLayerGroup);

        let oldIndex = startIndex;
        while (oldIndex < endIndex) {
            if (this._drawList[oldIndex] === drawableID) {
                break;
            }
            oldIndex++;
        }

        if (oldIndex < endIndex) {
            // Remove drawable from the list.
            if (order === 0) {
                return oldIndex;
            }

            const _ = this._drawList.splice(oldIndex, 1)[0];
            // Determine new index.
            let newIndex = order;
            if (optIsRelative) {
                newIndex += oldIndex;
            }

            const possibleMin = (optMin || 0) + startIndex;
            const min = (possibleMin >= startIndex && possibleMin < endIndex) ? possibleMin : startIndex;
            newIndex = Math.max(newIndex, min);

            newIndex = Math.min(newIndex, endIndex);

            // Insert at new index.
            this._drawList.splice(newIndex, 0, drawableID);
            return newIndex;
        }

        return null;
    }

    /**
     * Draw all current drawables and present the frame on the canvas.
     */
    draw () {
        this._doExitDrawRegion();

        const gl = this._gl;

        twgl.bindFramebufferInfo(gl, null);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(...this._backgroundColor4f);
        gl.clear(gl.COLOR_BUFFER_BIT);

        this._drawThese(this._drawList, ShaderManager.DRAW_MODE.default, this._projection, {
            framebufferWidth: gl.canvas.width,
            framebufferHeight: gl.canvas.height
        });
        if (this._snapshotCallbacks.length > 0) {
            const snapshot = gl.canvas.toDataURL();
            this._snapshotCallbacks.forEach(cb => cb(snapshot));
            this._snapshotCallbacks = [];
        }
    }

    /**
     * Get the precise bounds for a Drawable.
     * @param {int} drawableID ID of Drawable to get bounds for.
     * @return {object} Bounds for a tight box around the Drawable.
     */
    getBounds (drawableID) {
        const drawable = this._allDrawables[drawableID];
        // Tell the Drawable about its updated convex hull, if necessary.
        if (drawable.needsConvexHullPoints()) {
            const points = this._getConvexHullPointsForDrawable(drawableID);
            drawable.setConvexHullPoints(points);
        }
        const bounds = drawable.getFastBounds();
        // In debug mode, draw the bounds.
        if (this._debugCanvas) {
            const gl = this._gl;
            this._debugCanvas.width = gl.canvas.width;
            this._debugCanvas.height = gl.canvas.height;
            const context = this._debugCanvas.getContext('2d');
            context.drawImage(gl.canvas, 0, 0);
            context.strokeStyle = '#FF0000';
            const pr = window.devicePixelRatio;
            context.strokeRect(
                pr * (bounds.left + (this._nativeSize[0] / 2)),
                pr * (-bounds.top + (this._nativeSize[1] / 2)),
                pr * (bounds.right - bounds.left),
                pr * (-bounds.bottom + bounds.top)
            );
        }
        return bounds;
    }

    /**
     * Get the precise bounds for a Drawable around the top slice.
     * Used for positioning speech bubbles more closely to the sprite.
     * @param {int} drawableID ID of Drawable to get bubble bounds for.
     * @return {object} Bounds for a tight box around the Drawable top slice.
     */
    getBoundsForBubble (drawableID) {
        const drawable = this._allDrawables[drawableID];
        // Tell the Drawable about its updated convex hull, if necessary.
        if (drawable.needsConvexHullPoints()) {
            const points = this._getConvexHullPointsForDrawable(drawableID);
            drawable.setConvexHullPoints(points);
        }
        const bounds = drawable.getBoundsForBubble();
        // In debug mode, draw the bounds.
        if (this._debugCanvas) {
            const gl = this._gl;
            this._debugCanvas.width = gl.canvas.width;
            this._debugCanvas.height = gl.canvas.height;
            const context = this._debugCanvas.getContext('2d');
            context.drawImage(gl.canvas, 0, 0);
            context.strokeStyle = '#FF0000';
            const pr = window.devicePixelRatio;
            context.strokeRect(
                pr * (bounds.left + (this._nativeSize[0] / 2)),
                pr * (-bounds.top + (this._nativeSize[1] / 2)),
                pr * (bounds.right - bounds.left),
                pr * (-bounds.bottom + bounds.top)
            );
        }
        return bounds;
    }

    /**
     * Get the current skin (costume) size of a Drawable.
     * @param {int} drawableID The ID of the Drawable to measure.
     * @return {Array<number>} Skin size, width and height.
     */
    getCurrentSkinSize (drawableID) {
        const drawable = this._allDrawables[drawableID];
        return this.getSkinSize(drawable.skin.id);
    }

    /**
     * Get the size of a skin by ID.
     * @param {int} skinID The ID of the Skin to measure.
     * @return {Array<number>} Skin size, width and height.
     */
    getSkinSize (skinID) {
        const skin = this._allSkins[skinID];
        return skin.size;
    }

    /**
     * Get the rotation center of a skin by ID.
     * @param {int} skinID The ID of the Skin
     * @return {Array<number>} The rotationCenterX and rotationCenterY
     */
    getSkinRotationCenter (skinID) {
        const skin = this._allSkins[skinID];
        return skin.calculateRotationCenter();
    }

    /**
     * Check if a particular Drawable is touching a particular color.
     * Unlike touching drawable, if the "tester" is invisble, we will still test.
     * @param {int} drawableID The ID of the Drawable to check.
     * @param {Array<int>} color3b Test if the Drawable is touching this color.
     * @param {Array<int>} [mask3b] Optionally mask the check to this part of Drawable.
     * @returns {boolean} True iff the Drawable is touching the color.
     */
    isTouchingColor (drawableID, color3b, mask3b) {
        const candidates = this._candidatesTouching(drawableID, this._visibleDrawList);

        let bounds;
        if (colorMatches(color3b, this._backgroundColor3b, 0)) {
            // If the color we're checking for is the background color, don't confine the check to
            // candidate drawables' bounds--since the background spans the entire stage, we must check
            // everything that lies inside the drawable.
            bounds = this._touchingBounds(drawableID);
            // e.g. empty costume, or off the stage
            if (bounds === null) return false;
        } else if (candidates.length === 0) {
            // If not checking for the background color, we can return early if there are no candidate drawables.
            return false;
        } else {
            bounds = this._candidatesBounds(candidates);
        }

        const maxPixelsForCPU = this._getMaxPixelsForCPU();

        const debugCanvasContext = this._debugCanvas && this._debugCanvas.getContext('2d');
        if (debugCanvasContext) {
            this._debugCanvas.width = bounds.width;
            this._debugCanvas.height = bounds.height;
        }

        // if there are just too many pixels to CPU render efficiently, we need to let readPixels happen
        if (bounds.width * bounds.height * (candidates.length + 1) >= maxPixelsForCPU) {
            this._isTouchingColorGpuStart(drawableID, candidates.map(({id}) => id).reverse(), bounds, color3b, mask3b);
        }

        const drawable = this._allDrawables[drawableID];
        const point = __isTouchingDrawablesPoint;
        const color = __touchingColor;
        const hasMask = Boolean(mask3b);

        drawable.updateCPURenderAttributes();

        // Masked drawable ignores ghost effect
        const effectMask = ~ShaderManager.EFFECT_INFO.ghost.mask;

        // Scratch Space - +y is top
        for (let y = bounds.bottom; y <= bounds.top; y++) {
            if (bounds.width * (y - bounds.bottom) * (candidates.length + 1) >= maxPixelsForCPU) {
                return this._isTouchingColorGpuFin(bounds, color3b, y - bounds.bottom);
            }
            for (let x = bounds.left; x <= bounds.right; x++) {
                point[1] = y;
                point[0] = x;
                // if we use a mask, check our sample color...
                if (hasMask ?
                    maskMatches(Drawable.sampleColor4b(point, drawable, color, effectMask), mask3b) :
                    drawable.isTouching(point)) {
                    RenderWebGL.sampleColor3b(point, candidates, color);
                    if (debugCanvasContext) {
                        debugCanvasContext.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
                        debugCanvasContext.fillRect(x - bounds.left, bounds.bottom - y, 1, 1);
                    }
                    // ...and the target color is drawn at this pixel
                    if (colorMatches(color, color3b, 0)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    _getMaxPixelsForCPU () {
        switch (this._useGpuMode) {
        case RenderWebGL.UseGpuModes.ForceCPU:
            return Infinity;
        case RenderWebGL.UseGpuModes.ForceGPU:
            return 0;
        case RenderWebGL.UseGpuModes.Automatic:
        default:
            return __cpuTouchingColorPixelCount;
        }
    }

    _enterDrawBackground () {
        const gl = this.gl;
        const currentShader = this._shaderManager.getShader(ShaderManager.DRAW_MODE.background, 0);
        gl.disable(gl.BLEND);
        gl.useProgram(currentShader.program);
        twgl.setBuffersAndAttributes(gl, currentShader, this._bufferInfo);
    }

    _exitDrawBackground () {
        const gl = this.gl;
        gl.enable(gl.BLEND);
    }

    _isTouchingColorGpuStart (drawableID, candidateIDs, bounds, color3b, mask3b) {
        this._doExitDrawRegion();

        const gl = this._gl;
        twgl.bindFramebufferInfo(gl, this._queryBufferInfo);

        // Limit size of viewport to the bounds around the target Drawable,
        // and create the projection matrix for the draw.
        gl.viewport(0, 0, bounds.width, bounds.height);
        const projection = twgl.m4.ortho(bounds.left, bounds.right, bounds.top, bounds.bottom, -1, 1);

        // Clear the query buffer to fully transparent. This will be the color of pixels that fail the stencil test.
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

        let extraUniforms;
        if (mask3b) {
            extraUniforms = {
                u_colorMask: [mask3b[0] / 255, mask3b[1] / 255, mask3b[2] / 255],
                u_colorMaskTolerance: MASK_TOUCHING_COLOR_TOLERANCE / 255
            };
        }

        try {
            // Using the stencil buffer, mask out the drawing to either the drawable's alpha channel
            // or pixels of the drawable which match the mask color, depending on whether a mask color is given.
            // Masked-out pixels will not be checked.
            gl.enable(gl.STENCIL_TEST);
            gl.stencilFunc(gl.ALWAYS, 1, 1);
            gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
            gl.colorMask(false, false, false, false);
            this._drawThese(
                [drawableID],
                mask3b ?
                    ShaderManager.DRAW_MODE.colorMask :
                    ShaderManager.DRAW_MODE.silhouette,
                projection,
                {
                    extraUniforms,
                    ignoreVisibility: true, // Touching color ignores sprite visibility,
                    effectMask: ~ShaderManager.EFFECT_INFO.ghost.mask
                });

            gl.stencilFunc(gl.EQUAL, 1, 1);
            gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
            gl.colorMask(true, true, true, true);

            // Draw the background as a quad. Drawing a background with gl.clear will not mask to the stenciled area.
            this.enterDrawRegion(this._backgroundDrawRegionId);

            const uniforms = {
                u_backgroundColor: this._backgroundColor4f
            };

            const currentShader = this._shaderManager.getShader(ShaderManager.DRAW_MODE.background, 0);
            twgl.setUniforms(currentShader, uniforms);
            twgl.drawBufferInfo(gl, this._bufferInfo, gl.TRIANGLES);

            // Draw the candidate drawables on top of the background.
            this._drawThese(candidateIDs, ShaderManager.DRAW_MODE.default, projection,
                {idFilterFunc: testID => testID !== drawableID}
            );
        } finally {
            gl.colorMask(true, true, true, true);
            gl.disable(gl.STENCIL_TEST);
            this._doExitDrawRegion();
        }
    }

    _isTouchingColorGpuFin (bounds, color3b, stop) {
        const gl = this._gl;
        const pixels = new Uint8Array(Math.floor(bounds.width * (bounds.height - stop) * 4));
        gl.readPixels(0, 0, bounds.width, (bounds.height - stop), gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        if (this._debugCanvas) {
            this._debugCanvas.width = bounds.width;
            this._debugCanvas.height = bounds.height;
            const context = this._debugCanvas.getContext('2d');
            const imageData = context.getImageData(0, 0, bounds.width, bounds.height - stop);
            imageData.data.set(pixels);
            context.putImageData(imageData, 0, 0);
        }

        for (let pixelBase = 0; pixelBase < pixels.length; pixelBase += 4) {
            // Transparent pixels are masked (either by the drawable's alpha channel or color mask).
            if (pixels[pixelBase + 3] !== 0 && colorMatches(color3b, pixels, pixelBase)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if a particular Drawable is touching any in a set of Drawables.
     * @param {int} drawableID The ID of the Drawable to check.
     * @param {?Array<int>} candidateIDs The Drawable IDs to check, otherwise all visible drawables in the renderer
     * @returns {boolean} True if the Drawable is touching one of candidateIDs.
     */
    isTouchingDrawables (drawableID, candidateIDs = this._drawList) {
        const candidates = this._candidatesTouching(drawableID,
            // even if passed an invisible drawable, we will NEVER touch it!
            candidateIDs.filter(id => this._allDrawables[id]._visible));
        // if we are invisble we don't touch anything.
        if (candidates.length === 0 || !this._allDrawables[drawableID]._visible) {
            return false;
        }

        // Get the union of all the candidates intersections.
        const bounds = this._candidatesBounds(candidates);

        const drawable = this._allDrawables[drawableID];
        const point = __isTouchingDrawablesPoint;

        drawable.updateCPURenderAttributes();

        // This is an EXTREMELY brute force collision detector, but it is
        // still faster than asking the GPU to give us the pixels.
        for (let x = bounds.left; x <= bounds.right; x++) {
            // Scratch Space - +y is top
            point[0] = x;
            for (let y = bounds.bottom; y <= bounds.top; y++) {
                point[1] = y;
                if (drawable.isTouching(point)) {
                    for (let index = 0; index < candidates.length; index++) {
                        if (candidates[index].drawable.isTouching(point)) {
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    }

    /**
     * Convert a client based x/y position on the canvas to a Scratch 3 world space
     * Rectangle.  This creates recangles with a radius to cover selecting multiple
     * scratch pixels with touch / small render areas.
     *
     * @param {int} centerX The client x coordinate of the picking location.
     * @param {int} centerY The client y coordinate of the picking location.
     * @param {int} [width] The client width of the touch event (optional).
     * @param {int} [height] The client width of the touch event (optional).
     * @returns {Rectangle} Scratch world space rectangle, iterate bottom <= top,
     *                      left <= right.
     */
    clientSpaceToScratchBounds (centerX, centerY, width = 1, height = 1) {
        const gl = this._gl;

        const clientToScratchX = this._nativeSize[0] / gl.canvas.clientWidth;
        const clientToScratchY = this._nativeSize[1] / gl.canvas.clientHeight;

        width *= clientToScratchX;
        height *= clientToScratchY;

        width = Math.max(1, Math.min(Math.round(width), MAX_TOUCH_SIZE[0]));
        height = Math.max(1, Math.min(Math.round(height), MAX_TOUCH_SIZE[1]));
        const x = (centerX * clientToScratchX) - ((width - 1) / 2);
        // + because scratch y is inverted
        const y = (centerY * clientToScratchY) + ((height - 1) / 2);

        const xOfs = (width % 2) ? 0 : -0.5;
        // y is offset +0.5
        const yOfs = (height % 2) ? 0 : -0.5;

        const bounds = new Rectangle();
        bounds.initFromBounds(Math.floor(this._xLeft + x + xOfs), Math.floor(this._xLeft + x + xOfs + width - 1),
            Math.ceil(this._yTop - y + yOfs), Math.ceil(this._yTop - y + yOfs + height - 1));
        return bounds;
    }

    /**
     * Determine if the drawable is touching a client based x/y.  Helper method for sensing
     * touching mouse-pointer.  Ignores visibility.
     *
     * @param {int} drawableID The ID of the drawable to check.
     * @param {int} centerX The client x coordinate of the picking location.
     * @param {int} centerY The client y coordinate of the picking location.
     * @param {int} [touchWidth] The client width of the touch event (optional).
     * @param {int} [touchHeight] The client height of the touch event (optional).
     * @returns {boolean} If the drawable has any pixels that would draw in the touch area
     */
    drawableTouching (drawableID, centerX, centerY, touchWidth, touchHeight) {
        const drawable = this._allDrawables[drawableID];
        if (!drawable) {
            return false;
        }
        const bounds = this.clientSpaceToScratchBounds(centerX, centerY, touchWidth, touchHeight);
        const worldPos = twgl.v3.create();

        drawable.updateCPURenderAttributes();

        for (worldPos[1] = bounds.bottom; worldPos[1] <= bounds.top; worldPos[1]++) {
            for (worldPos[0] = bounds.left; worldPos[0] <= bounds.right; worldPos[0]++) {
                if (drawable.isTouching(worldPos)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Detect which sprite, if any, is at the given location.
     * This function will pick all drawables that are visible, unless specific
     * candidate drawable IDs are provided.  Used for determining what is clicked
     * or dragged.  Will not select hidden / ghosted sprites.
     *
     * @param {int} centerX The client x coordinate of the picking location.
     * @param {int} centerY The client y coordinate of the picking location.
     * @param {int} [touchWidth] The client width of the touch event (optional).
     * @param {int} [touchHeight] The client height of the touch event (optional).
     * @param {Array<int>} [candidateIDs] The Drawable IDs to pick from, otherwise all visible drawables.
     * @returns {int} The ID of the topmost Drawable under the picking location, or
     * RenderConstants.ID_NONE if there is no Drawable at that location.
     */
    pick (centerX, centerY, touchWidth, touchHeight, candidateIDs) {
        const bounds = this.clientSpaceToScratchBounds(centerX, centerY, touchWidth, touchHeight);
        if (bounds.left === -Infinity || bounds.bottom === -Infinity) {
            return false;
        }

        candidateIDs = (candidateIDs || this._drawList).filter(id => {
            const drawable = this._allDrawables[id];
            // default pick list ignores visible and ghosted sprites.
            if (drawable.getVisible() && drawable.getUniforms().u_ghost !== 0) {
                const drawableBounds = drawable.getFastBounds();
                const inRange = bounds.intersects(drawableBounds);
                if (!inRange) return false;

                drawable.updateCPURenderAttributes();
                return true;
            }
            return false;
        });
        if (candidateIDs.length === 0) {
            return false;
        }

        const hits = [];
        const worldPos = twgl.v3.create(0, 0, 0);
        // Iterate over the scratch pixels and check if any candidate can be
        // touched at that point.
        for (worldPos[1] = bounds.bottom; worldPos[1] <= bounds.top; worldPos[1]++) {
            for (worldPos[0] = bounds.left; worldPos[0] <= bounds.right; worldPos[0]++) {

                // Check candidates in the reverse order they would have been
                // drawn. This will determine what candiate's silhouette pixel
                // would have been drawn at the point.
                for (let d = candidateIDs.length - 1; d >= 0; d--) {
                    const id = candidateIDs[d];
                    const drawable = this._allDrawables[id];
                    if (drawable.isTouching(worldPos)) {
                        hits[id] = (hits[id] || 0) + 1;
                        break;
                    }
                }
            }
        }

        // Bias toward selecting anything over nothing
        hits[RenderConstants.ID_NONE] = 0;

        let hit = RenderConstants.ID_NONE;
        for (const hitID in hits) {
            if (Object.prototype.hasOwnProperty.call(hits, hitID) && (hits[hitID] > hits[hit])) {
                hit = hitID;
            }
        }

        return Number(hit);
    }

    /**
     * @typedef DrawableExtraction
     * @property {ImageData} data Raw pixel data for the drawable
     * @property {number} x The x coordinate of the drawable's bounding box's top-left corner, in 'CSS pixels'
     * @property {number} y The y coordinate of the drawable's bounding box's top-left corner, in 'CSS pixels'
     * @property {number} width The drawable's bounding box width, in 'CSS pixels'
     * @property {number} height The drawable's bounding box height, in 'CSS pixels'
     */

    /**
     * Return a drawable's pixel data and bounds in screen space.
     * @param {int} drawableID The ID of the drawable to get pixel data for
     * @return {DrawableExtraction} Data about the picked drawable
     */
    extractDrawableScreenSpace (drawableID) {
        const drawable = this._allDrawables[drawableID];
        if (!drawable) throw new Error(`Could not extract drawable with ID ${drawableID}; it does not exist`);

        this._doExitDrawRegion();

        const nativeCenterX = this._nativeSize[0] * 0.5;
        const nativeCenterY = this._nativeSize[1] * 0.5;

        const scratchBounds = drawable.getFastBounds();

        const canvas = this.canvas;
        // Ratio of the screen-space scale of the stage's canvas to the "native size" of the stage
        const scaleFactor = canvas.width / this._nativeSize[0];

        // Bounds of the extracted drawable, in "canvas pixel space"
        // (origin is 0, 0, destination is the canvas width, height).
        const canvasSpaceBounds = new Rectangle();
        canvasSpaceBounds.initFromBounds(
            (scratchBounds.left + nativeCenterX) * scaleFactor,
            (scratchBounds.right + nativeCenterX) * scaleFactor,
            // in "canvas space", +y is down, but Rectangle methods assume bottom < top, so swap them
            (nativeCenterY - scratchBounds.top) * scaleFactor,
            (nativeCenterY - scratchBounds.bottom) * scaleFactor
        );
        canvasSpaceBounds.snapToInt();

        // undo the transformation to transform the bounds, snapped to "canvas-pixel space", back to "Scratch space"
        // We have to transform -> snap -> invert transform so that the "Scratch-space" bounds are snapped in
        // "canvas-pixel space".
        scratchBounds.initFromBounds(
            (canvasSpaceBounds.left / scaleFactor) - nativeCenterX,
            (canvasSpaceBounds.right / scaleFactor) - nativeCenterX,
            nativeCenterY - (canvasSpaceBounds.top / scaleFactor),
            nativeCenterY - (canvasSpaceBounds.bottom / scaleFactor)
        );

        const gl = this._gl;

        // Set a reasonable max limit width and height for the bufferInfo bounds
        const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        const clampedWidth = Math.min(MAX_EXTRACTED_DRAWABLE_DIMENSION, canvasSpaceBounds.width, maxTextureSize);
        const clampedHeight = Math.min(MAX_EXTRACTED_DRAWABLE_DIMENSION, canvasSpaceBounds.height, maxTextureSize);

        // Make a new bufferInfo since this._queryBufferInfo is limited to 480x360
        const bufferInfo = twgl.createFramebufferInfo(gl, [{format: gl.RGBA}], clampedWidth, clampedHeight);

        try {
            twgl.bindFramebufferInfo(gl, bufferInfo);

            // Limit size of viewport to the bounds around the target Drawable,
            // and create the projection matrix for the draw.
            gl.viewport(0, 0, clampedWidth, clampedHeight);
            const projection = twgl.m4.ortho(
                scratchBounds.left,
                scratchBounds.right,
                scratchBounds.top,
                scratchBounds.bottom,
                -1, 1
            );

            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            this._drawThese([drawableID], ShaderManager.DRAW_MODE.straightAlpha, projection,
                {
                    // Don't apply the ghost effect. TODO: is this an intentional design decision?
                    effectMask: ~ShaderManager.EFFECT_INFO.ghost.mask,
                    // We're doing this in screen-space, so the framebuffer dimensions should be those of the canvas in
                    // screen-space. This is used to ensure SVG skins are rendered at the proper resolution.
                    framebufferWidth: canvas.width,
                    framebufferHeight: canvas.height
                });

            const data = new Uint8Array(Math.floor(clampedWidth * clampedHeight * 4));
            gl.readPixels(0, 0, clampedWidth, clampedHeight, gl.RGBA, gl.UNSIGNED_BYTE, data);
            // readPixels can only read into a Uint8Array, but ImageData has to take a Uint8ClampedArray.
            // We can share the same underlying buffer between them to avoid having to copy any data.
            const imageData = new ImageData(new Uint8ClampedArray(data.buffer), clampedWidth, clampedHeight);

            // On high-DPI devices, the canvas' width (in canvas pixels) will be larger than its width in CSS pixels.
            // We want to return the CSS-space bounds,
            // so take into account the ratio between the canvas' pixel dimensions and its layout dimensions.
            // This is usually the same as 1 / window.devicePixelRatio, but if e.g. you zoom your browser window without
            // the canvas resizing, then it'll differ.
            const ratio = canvas.getBoundingClientRect().width / canvas.width;

            return {
                imageData,
                x: canvasSpaceBounds.left * ratio,
                y: canvasSpaceBounds.bottom * ratio,
                width: canvasSpaceBounds.width * ratio,
                height: canvasSpaceBounds.height * ratio
            };
        } finally {
            gl.deleteFramebuffer(bufferInfo.framebuffer);
        }
    }

    /**
     * @typedef ColorExtraction
     * @property {Uint8Array} data Raw pixel data for the drawable
     * @property {int} width Drawable bounding box width
     * @property {int} height Drawable bounding box height
     * @property {object} color Color object with RGBA properties at picked location
     */

    /**
     * Return drawable pixel data and color at a given position
     * @param {int} x The client x coordinate of the picking location.
     * @param {int} y The client y coordinate of the picking location.
     * @param {int} radius The client radius to extract pixels with.
     * @return {?ColorExtraction} Data about the picked color
     */
    extractColor (x, y, radius) {
        this._doExitDrawRegion();

        const scratchX = Math.round(this._nativeSize[0] * ((x / this._gl.canvas.clientWidth) - 0.5));
        const scratchY = Math.round(-this._nativeSize[1] * ((y / this._gl.canvas.clientHeight) - 0.5));

        const gl = this._gl;
        twgl.bindFramebufferInfo(gl, this._queryBufferInfo);

        const bounds = new Rectangle();
        bounds.initFromBounds(scratchX - radius, scratchX + radius, scratchY - radius, scratchY + radius);

        const pickX = scratchX - bounds.left;
        const pickY = bounds.top - scratchY;

        gl.viewport(0, 0, bounds.width, bounds.height);
        const projection = twgl.m4.ortho(bounds.left, bounds.right, bounds.top, bounds.bottom, -1, 1);

        gl.clearColor(...this._backgroundColor4f);
        gl.clear(gl.COLOR_BUFFER_BIT);
        this._drawThese(this._drawList, ShaderManager.DRAW_MODE.default, projection);

        const data = new Uint8Array(Math.floor(bounds.width * bounds.height * 4));
        gl.readPixels(0, 0, bounds.width, bounds.height, gl.RGBA, gl.UNSIGNED_BYTE, data);

        const pixelBase = Math.floor(4 * ((pickY * bounds.width) + pickX));
        const color = {
            r: data[pixelBase],
            g: data[pixelBase + 1],
            b: data[pixelBase + 2],
            a: data[pixelBase + 3]
        };

        if (this._debugCanvas) {
            this._debugCanvas.width = bounds.width;
            this._debugCanvas.height = bounds.height;
            const ctx = this._debugCanvas.getContext('2d');
            const imageData = ctx.createImageData(bounds.width, bounds.height);
            imageData.data.set(data);
            ctx.putImageData(imageData, 0, 0);
            ctx.strokeStyle = 'black';
            ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
            ctx.rect(pickX - 4, pickY - 4, 8, 8);
            ctx.fill();
            ctx.stroke();
        }

        return {
            data: data,
            width: bounds.width,
            height: bounds.height,
            color: color
        };
    }

    /**
     * Get the candidate bounding box for a touching query.
     * @param {int} drawableID ID for drawable of query.
     * @return {?Rectangle} Rectangle bounds for touching query, or null.
     */
    _touchingBounds (drawableID) {
        const drawable = this._allDrawables[drawableID];

        /** @todo remove this once URL-based skin setting is removed. */
        if (!drawable.skin || !drawable.skin.getTexture([100, 100])) return null;

        const bounds = drawable.getFastBounds();

        // Limit queries to the stage size.
        bounds.clamp(this._xLeft, this._xRight, this._yBottom, this._yTop);

        // Use integer coordinates for queries - weird things happen
        // when you provide float width/heights to gl.viewport and projection.
        bounds.snapToInt();

        if (bounds.width === 0 || bounds.height === 0) {
            // No space to query.
            return null;
        }
        return bounds;
    }

    /**
     * Filter a list of candidates for a touching query into only those that
     * could possibly intersect the given bounds.
     * @param {int} drawableID - ID for drawable of query.
     * @param {Array<int>} candidateIDs - Candidates for touching query.
     * @return {?Array< {id, drawable, intersection} >} Filtered candidates with useful data.
     */
    _candidatesTouching (drawableID, candidateIDs) {
        const bounds = this._touchingBounds(drawableID);
        const result = [];
        if (bounds === null) {
            return result;
        }
        // iterate through the drawables list BACKWARDS - we want the top most item to be the first we check
        for (let index = candidateIDs.length - 1; index >= 0; index--) {
            const id = candidateIDs[index];
            if (id !== drawableID) {
                const drawable = this._allDrawables[id];
                // Text bubbles aren't considered in "touching" queries
                if (drawable.skin instanceof TextBubbleSkin) continue;
                if (drawable.skin && drawable._visible) {
                    // Update the CPU position data
                    drawable.updateCPURenderAttributes();
                    const candidateBounds = drawable.getFastBounds();

                    // Push bounds out to integers. If a drawable extends out into half a pixel, that half-pixel still
                    // needs to be tested. Plus, in some areas we construct another rectangle from the union of these,
                    // and iterate over its pixels (width * height). Turns out that doesn't work so well when the
                    // width/height aren't integers.
                    candidateBounds.snapToInt();

                    if (bounds.intersects(candidateBounds)) {
                        result.push({
                            id,
                            drawable,
                            intersection: Rectangle.intersect(bounds, candidateBounds)
                        });
                    }
                }
            }
        }
        return result;
    }

    /**
     * Helper to get the union bounds from a set of candidates returned from the above method
     * @private
     * @param {Array<object>} candidates info from _candidatesTouching
     * @return {Rectangle} the outer bounding box union
     */
    _candidatesBounds (candidates) {
        return candidates.reduce((memo, {intersection}) => {
            if (!memo) {
                return intersection;
            }
            // store the union of the two rectangles in our static rectangle instance
            return Rectangle.union(memo, intersection, __candidatesBounds);
        }, null);
    }

    /**
     * Update a drawable's skin.
     * @param {number} drawableID The drawable's id.
     * @param {number} skinId The skin to update to.
     */
    updateDrawableSkinId (drawableID, skinId) {
        const drawable = this._allDrawables[drawableID];
        // TODO: https://github.com/LLK/scratch-vm/issues/2288
        if (!drawable) return;
        drawable.skin = this._allSkins[skinId];
    }

    /**
     * Update a drawable's position.
     * @param {number} drawableID The drawable's id.
     * @param {Array.<number>} position The new position.
     */
    updateDrawablePosition (drawableID, position) {
        const drawable = this._allDrawables[drawableID];
        // TODO: https://github.com/LLK/scratch-vm/issues/2288
        if (!drawable) return;
        drawable.updatePosition(position);
    }

    /**
     * Update a drawable's direction.
     * @param {number} drawableID The drawable's id.
     * @param {number} direction A new direction.
     */
    updateDrawableDirection (drawableID, direction) {
        const drawable = this._allDrawables[drawableID];
        // TODO: https://github.com/LLK/scratch-vm/issues/2288
        if (!drawable) return;
        drawable.updateDirection(direction);
    }

    /**
     * Update a drawable's scale.
     * @param {number} drawableID The drawable's id.
     * @param {Array.<number>} scale A new scale.
     */
    updateDrawableScale (drawableID, scale) {
        const drawable = this._allDrawables[drawableID];
        // TODO: https://github.com/LLK/scratch-vm/issues/2288
        if (!drawable) return;
        drawable.updateScale(scale);
    }

    /**
     * Update a drawable's direction and scale together.
     * @param {number} drawableID The drawable's id.
     * @param {number} direction A new direction.
     * @param {Array.<number>} scale A new scale.
     */
    updateDrawableDirectionScale (drawableID, direction, scale) {
        const drawable = this._allDrawables[drawableID];
        // TODO: https://github.com/LLK/scratch-vm/issues/2288
        if (!drawable) return;
        drawable.updateDirection(direction);
        drawable.updateScale(scale);
    }

    /**
     * Update a drawable's visibility.
     * @param {number} drawableID The drawable's id.
     * @param {boolean} visible Will the drawable be visible?
     */
    updateDrawableVisible (drawableID, visible) {
        const drawable = this._allDrawables[drawableID];
        // TODO: https://github.com/LLK/scratch-vm/issues/2288
        if (!drawable) return;
        drawable.updateVisible(visible);
    }

    /**
     * Update a drawable's visual effect.
     * @param {number} drawableID The drawable's id.
     * @param {string} effectName The effect to change.
     * @param {number} value A new effect value.
     */
    updateDrawableEffect (drawableID, effectName, value) {
        const drawable = this._allDrawables[drawableID];
        // TODO: https://github.com/LLK/scratch-vm/issues/2288
        if (!drawable) return;
        drawable.updateEffect(effectName, value);
    }

    /**
     * Update the position, direction, scale, or effect properties of this Drawable.
     * @deprecated Use specific updateDrawable* methods instead.
     * @param {int} drawableID The ID of the Drawable to update.
     * @param {object.<string,*>} properties The new property values to set.
     */
    updateDrawableProperties (drawableID, properties) {
        const drawable = this._allDrawables[drawableID];
        if (!drawable) {
            /**
             * @todo(https://github.com/LLK/scratch-vm/issues/2288) fix whatever's wrong in the VM which causes this, then add a warning or throw here.
             * Right now this happens so much on some projects that a warning or exception here can hang the browser.
             */
            return;
        }
        if ('skinId' in properties) {
            this.updateDrawableSkinId(drawableID, properties.skinId);
        }
        drawable.updateProperties(properties);
    }

    /**
     * Update the position object's x & y members to keep the drawable fenced in view.
     * @param {int} drawableID - The ID of the Drawable to update.
     * @param {Array.<number, number>} position to be fenced - An array of type [x, y]
     * @return {Array.<number, number>} The fenced position as an array [x, y]
     */
    getFencedPositionOfDrawable (drawableID, position) {
        let x = position[0];
        let y = position[1];

        const drawable = this._allDrawables[drawableID];
        if (!drawable) {
            // @todo(https://github.com/LLK/scratch-vm/issues/2288) fix whatever's wrong in the VM which causes this, then add a warning or throw here.
            // Right now this happens so much on some projects that a warning or exception here can hang the browser.
            return [x, y];
        }

        const dx = x - drawable._position[0];
        const dy = y - drawable._position[1];
        const aabb = drawable._skin.getFenceBounds(drawable, __fenceBounds);
        const inset = Math.floor(Math.min(aabb.width, aabb.height) / 2);

        const sx = this._xRight - Math.min(FENCE_WIDTH, inset);
        if (aabb.right + dx < -sx) {
            x = Math.ceil(drawable._position[0] - (sx + aabb.right));
        } else if (aabb.left + dx > sx) {
            x = Math.floor(drawable._position[0] + (sx - aabb.left));
        }
        const sy = this._yTop - Math.min(FENCE_WIDTH, inset);
        if (aabb.top + dy < -sy) {
            y = Math.ceil(drawable._position[1] - (sy + aabb.top));
        } else if (aabb.bottom + dy > sy) {
            y = Math.floor(drawable._position[1] + (sy - aabb.bottom));
        }
        return [x, y];
    }

    /**
     * Clear a pen layer.
     * @param {int} penSkinID - the unique ID of a Pen Skin.
     */
    penClear (penSkinID) {
        const skin = /** @type {PenSkin} */ this._allSkins[penSkinID];
        skin.clear();
    }

    /**
     * Draw a point on a pen layer.
     * @param {int} penSkinID - the unique ID of a Pen Skin.
     * @param {PenAttributes} penAttributes - how the point should be drawn.
     * @param {number} x - the X coordinate of the point to draw.
     * @param {number} y - the Y coordinate of the point to draw.
     */
    penPoint (penSkinID, penAttributes, x, y) {
        const skin = /** @type {PenSkin} */ this._allSkins[penSkinID];
        skin.drawPoint(penAttributes, x, y);
    }

    /**
     * Draw a line on a pen layer.
     * @param {int} penSkinID - the unique ID of a Pen Skin.
     * @param {PenAttributes} penAttributes - how the line should be drawn.
     * @param {number} x0 - the X coordinate of the beginning of the line.
     * @param {number} y0 - the Y coordinate of the beginning of the line.
     * @param {number} x1 - the X coordinate of the end of the line.
     * @param {number} y1 - the Y coordinate of the end of the line.
     */
    penLine (penSkinID, penAttributes, x0, y0, x1, y1) {
        const skin = /** @type {PenSkin} */ this._allSkins[penSkinID];
        skin.drawLine(penAttributes, x0, y0, x1, y1);
    }

    /**
     * Stamp a Drawable onto a pen layer.
     * @param {int} penSkinID - the unique ID of a Pen Skin.
     * @param {int} stampID - the unique ID of the Drawable to use as the stamp.
     */
    penStamp (penSkinID, stampID) {
        const stampDrawable = this._allDrawables[stampID];
        if (!stampDrawable) {
            return;
        }

        const bounds = this._touchingBounds(stampID);
        if (!bounds) {
            return;
        }

        this._doExitDrawRegion();

        const skin = /** @type {PenSkin} */ this._allSkins[penSkinID];

        const gl = this._gl;
        twgl.bindFramebufferInfo(gl, skin._framebuffer);

        // Limit size of viewport to the bounds around the stamp Drawable and create the projection matrix for the draw.
        gl.viewport(
            (this._nativeSize[0] * 0.5) + bounds.left,
            (this._nativeSize[1] * 0.5) - bounds.top,
            bounds.width,
            bounds.height
        );
        const projection = twgl.m4.ortho(bounds.left, bounds.right, bounds.top, bounds.bottom, -1, 1);

        // Draw the stamped sprite onto the PenSkin's framebuffer.
        this._drawThese([stampID], ShaderManager.DRAW_MODE.default, projection, {ignoreVisibility: true});
        skin._silhouetteDirty = true;
    }

    /* ******
     * Truly internal functions: these support the functions above.
     ********/

    /**
     * Build geometry (vertex and index) buffers.
     * @private
     */
    _createGeometry () {
        const quad = {
            a_position: {
                numComponents: 2,
                data: [
                    -0.5, -0.5,
                    0.5, -0.5,
                    -0.5, 0.5,
                    -0.5, 0.5,
                    0.5, -0.5,
                    0.5, 0.5
                ]
            },
            a_texCoord: {
                numComponents: 2,
                data: [
                    1, 0,
                    0, 0,
                    1, 1,
                    1, 1,
                    0, 0,
                    0, 1
                ]
            }
        };
        this._bufferInfo = twgl.createBufferInfoFromArrays(this._gl, quad);
    }

    /**
     * Respond to a change in the "native" rendering size. The native size is used by buffers which are fixed in size
     * regardless of the size of the main render target. This includes the buffers used for queries such as picking and
     * color-touching. The fixed size allows (more) consistent behavior across devices and presentation modes.
     * @param {object} event - The change event.
     * @private
     */
    onNativeSizeChanged (event) {
        const [width, height] = event.newSize;

        const gl = this._gl;
        const attachments = [
            {format: gl.RGBA},
            {format: gl.DEPTH_STENCIL}
        ];

        if (!this._pickBufferInfo) {
            this._pickBufferInfo = twgl.createFramebufferInfo(gl, attachments, MAX_TOUCH_SIZE[0], MAX_TOUCH_SIZE[1]);
        }

        /** @todo should we create this on demand to save memory? */
        // A 480x360 32-bpp buffer is 675 KiB.
        if (this._queryBufferInfo) {
            twgl.resizeFramebufferInfo(gl, this._queryBufferInfo, attachments, width, height);
        } else {
            this._queryBufferInfo = twgl.createFramebufferInfo(gl, attachments, width, height);
        }
    }

    /**
     * Enter a draw region.
     *
     * A draw region is where multiple draw operations are performed with the
     * same GL state. WebGL performs poorly when it changes state like blend
     * mode. Marking a collection of state values as a "region" the renderer
     * can skip superfluous extra state calls when it is already in that
     * region. Since one region may be entered from within another a exit
     * handle can also be registered that is called when a new region is about
     * to be entered to restore a common inbetween state.
     *
     * @param {any} regionId - id of the region to enter
     * @param {function} enter - handle to call when first entering a region
     * @param {function} exit - handle to call when leaving a region
     */
    enterDrawRegion (regionId, enter = regionId.enter, exit = regionId.exit) {
        if (this._regionId !== regionId) {
            this._doExitDrawRegion();
            this._regionId = regionId;
            enter();
            this._exitRegion = exit;
        }
    }

    /**
     * Forcefully exit the current region returning to a common inbetween GL
     * state.
     */
    _doExitDrawRegion () {
        if (this._exitRegion !== null) {
            this._exitRegion();
        }
        this._exitRegion = null;
        this._regionId = null;
    }

    /**
     * Draw a set of Drawables, by drawable ID
     * @param {Array<int>} drawables The Drawable IDs to draw, possibly this._drawList.
     * @param {ShaderManager.DRAW_MODE} drawMode Draw normally, silhouette, etc.
     * @param {module:twgl/m4.Mat4} projection The projection matrix to use.
     * @param {object} [opts] Options for drawing
     * @param {idFilterFunc} opts.filter An optional filter function.
     * @param {object.<string,*>} opts.extraUniforms Extra uniforms for the shaders.
     * @param {int} opts.effectMask Bitmask for effects to allow
     * @param {boolean} opts.ignoreVisibility Draw all, despite visibility (e.g. stamping, touching color)
     * @param {int} opts.framebufferWidth The width of the framebuffer being drawn onto. Defaults to "native" width
     * @param {int} opts.framebufferHeight The height of the framebuffer being drawn onto. Defaults to "native" height
     * @private
     */
    _drawThese (drawables, drawMode, projection, opts = {}) {

        const gl = this._gl;
        let currentShader = null;

        const framebufferSpaceScaleDiffers = (
            'framebufferWidth' in opts && 'framebufferHeight' in opts &&
            opts.framebufferWidth !== this._nativeSize[0] && opts.framebufferHeight !== this._nativeSize[1]
        );

        const numDrawables = drawables.length;
        for (let drawableIndex = 0; drawableIndex < numDrawables; ++drawableIndex) {
            const drawableID = drawables[drawableIndex];

            // If we have a filter, check whether the ID fails
            if (opts.filter && !opts.filter(drawableID)) continue;

            const drawable = this._allDrawables[drawableID];
            /** @todo check if drawable is inside the viewport before anything else */

            // Hidden drawables (e.g., by a "hide" block) are not drawn unless
            // the ignoreVisibility flag is used (e.g. for stamping or touchingColor).
            if (!drawable.getVisible() && !opts.ignoreVisibility) continue;

            // drawableScale is the "framebuffer-pixel-space" scale of the drawable, as percentages of the drawable's
            // "native size" (so 100 = same as skin's "native size", 200 = twice "native size").
            // If the framebuffer dimensions are the same as the stage's "native" size, there's no need to calculate it.
            const drawableScale = framebufferSpaceScaleDiffers ? [
                drawable.scale[0] * opts.framebufferWidth / this._nativeSize[0],
                drawable.scale[1] * opts.framebufferHeight / this._nativeSize[1]
            ] : drawable.scale;

            // If the skin or texture isn't ready yet, skip it.
            if (!drawable.skin || !drawable.skin.getTexture(drawableScale)) continue;

            const uniforms = {};

            let effectBits = drawable.enabledEffects;
            effectBits &= Object.prototype.hasOwnProperty.call(opts, 'effectMask') ? opts.effectMask : effectBits;
            const newShader = this._shaderManager.getShader(drawMode, effectBits);

            // Manually perform region check. Do not create functions inside a
            // loop.
            if (this._regionId !== newShader) {
                this._doExitDrawRegion();
                this._regionId = newShader;

                currentShader = newShader;
                gl.useProgram(currentShader.program);
                twgl.setBuffersAndAttributes(gl, currentShader, this._bufferInfo);
                Object.assign(uniforms, {
                    u_projectionMatrix: projection
                });
            }

            Object.assign(uniforms,
                drawable.skin.getUniforms(drawableScale),
                drawable.getUniforms());

            // Apply extra uniforms after the Drawable's, to allow overwriting.
            if (opts.extraUniforms) {
                Object.assign(uniforms, opts.extraUniforms);
            }

            if (uniforms.u_skin) {
                twgl.setTextureParameters(
                    gl, uniforms.u_skin, {
                        minMag: drawable.skin.useNearest(drawableScale, drawable) ? gl.NEAREST : gl.LINEAR
                    }
                );
            }

            twgl.setUniforms(currentShader, uniforms);
            twgl.drawBufferInfo(gl, this._bufferInfo, gl.TRIANGLES);
        }

        this._regionId = null;
    }

    /**
     * Get the convex hull points for a particular Drawable.
     * To do this, calculate it based on the drawable's Silhouette.
     * @param {int} drawableID The Drawable IDs calculate convex hull for.
     * @return {Array<Array<number>>} points Convex hull points, as [[x, y], ...]
     */
    _getConvexHullPointsForDrawable (drawableID) {
        const drawable = this._allDrawables[drawableID];

        const [width, height] = drawable.skin.size;
        // No points in the hull if invisible or size is 0.
        if (!drawable.getVisible() || width === 0 || height === 0) {
            return [];
        }

        drawable.updateCPURenderAttributes();

        /**
         * Return the determinant of two vectors, the vector from A to B and the vector from A to C.
         *
         * The determinant is useful in this case to know if AC is counter-clockwise from AB.
         * A positive value means that AC is counter-clockwise from AB. A negative value means AC is clockwise from AB.
         *
         * @param {Float32Array} A A 2d vector in space.
         * @param {Float32Array} B A 2d vector in space.
         * @param {Float32Array} C A 2d vector in space.
         * @return {number} Greater than 0 if counter clockwise, less than if clockwise, 0 if all points are on a line.
         */
        const determinant = function (A, B, C) {
            // AB = B - A
            // AC = C - A
            // det (AB BC) = AB0 * AC1 - AB1 * AC0
            return (((B[0] - A[0]) * (C[1] - A[1])) - ((B[1] - A[1]) * (C[0] - A[0])));
        };

        // This algorithm for calculating the convex hull somewhat resembles the monotone chain algorithm.
        // The main difference is that instead of sorting the points by x-coordinate, and y-coordinate in case of ties,
        // it goes through them by y-coordinate in the outer loop and x-coordinate in the inner loop.
        // This gives us "left" and "right" hulls, whereas the monotone chain algorithm gives "top" and "bottom" hulls.
        // Adapted from https://github.com/LLK/scratch-flash/blob/dcbeeb59d44c3be911545dfe54d46a32404f8e69/src/scratch/ScratchCostume.as#L369-L413

        const leftHull = [];
        const rightHull = [];

        // While convex hull algorithms usually push and pop values from the list of hull points,
        // here, we keep indices for the "last" point in each array. Any points past these indices are ignored.
        // This is functionally equivalent to pushing and popping from a "stack" of hull points.
        let leftEndPointIndex = -1;
        let rightEndPointIndex = -1;

        const _pixelPos = twgl.v3.create();
        const _effectPos = twgl.v3.create();

        let currentPoint;

        // *Not* Scratch Space-- +y is bottom
        // Loop over all rows of pixels, starting at the top
        for (let y = 0; y < height; y++) {
            _pixelPos[1] = y / height;

            // We start at the leftmost point, then go rightwards until we hit an opaque pixel
            let x = 0;
            for (; x < width; x++) {
                _pixelPos[0] = x / width;
                EffectTransform.transformPoint(drawable, _pixelPos, _effectPos);
                if (drawable.skin.isTouchingLinear(_effectPos)) {
                    currentPoint = [x, y];
                    break;
                }
            }

            // If we managed to loop all the way through, there are no opaque pixels on this row. Go to the next one
            if (x >= width) {
                continue;
            }

            // Because leftEndPointIndex is initialized to -1, this is skipped for the first two rows.
            // It runs only when there are enough points in the left hull to make at least one line.
            // If appending the current point to the left hull makes a counter-clockwise turn,
            // we want to append the current point. Otherwise, we decrement the index of the "last" hull point until the
            // current point makes a counter-clockwise turn.
            // This decrementing has the same effect as popping from the point list, but is hopefully faster.
            while (leftEndPointIndex > 0) {
                if (determinant(leftHull[leftEndPointIndex], leftHull[leftEndPointIndex - 1], currentPoint) > 0) {
                    break;
                } else {
                    // leftHull.pop();
                    --leftEndPointIndex;
                }
            }

            // This has the same effect as pushing to the point list.
            // This "list head pointer" coding style leaves excess points dangling at the end of the list,
            // but that doesn't matter; we simply won't copy them over to the final hull.

            // leftHull.push(currentPoint);
            leftHull[++leftEndPointIndex] = currentPoint;

            // Now we repeat the process for the right side, looking leftwards for a pixel.
            for (x = width - 1; x >= 0; x--) {
                _pixelPos[0] = x / width;
                EffectTransform.transformPoint(drawable, _pixelPos, _effectPos);
                if (drawable.skin.isTouchingLinear(_effectPos)) {
                    currentPoint = [x, y];
                    break;
                }
            }

            // Because we're coming at this from the right, it goes clockwise this time.
            while (rightEndPointIndex > 0) {
                if (determinant(rightHull[rightEndPointIndex], rightHull[rightEndPointIndex - 1], currentPoint) < 0) {
                    break;
                } else {
                    --rightEndPointIndex;
                }
            }

            rightHull[++rightEndPointIndex] = currentPoint;
        }

        // Start off "hullPoints" with the left hull points.
        const hullPoints = leftHull;
        // This is where we get rid of those dangling extra points.
        hullPoints.length = leftEndPointIndex + 1;
        // Add points from the right side in reverse order so all points are ordered clockwise.
        for (let j = rightEndPointIndex; j >= 0; --j) {
            hullPoints.push(rightHull[j]);
        }

        // Simplify boundary points using hull.js.
        // TODO: Remove this; this algorithm already generates convex hulls.
        return hull(hullPoints, Infinity);
    }

    /**
     * Sample a "final" color from an array of drawables at a given scratch space.
     * Will blend any alpha values with the drawables "below" it.
     * @param {twgl.v3} vec Scratch Vector Space to sample
     * @param {Array<Drawables>} drawables A list of drawables with the "top most"
     *              drawable at index 0
     * @param {Uint8ClampedArray} dst The color3b space to store the answer in.
     * @return {Uint8ClampedArray} The dst vector with everything blended down.
     */
    static sampleColor3b (vec, drawables, dst) {
        dst = dst || new Uint8ClampedArray(3);
        dst.fill(0);
        let blendAlpha = 1;
        for (let index = 0; blendAlpha !== 0 && index < drawables.length; index++) {
            /*
            if (left > vec[0] || right < vec[0] ||
                bottom > vec[1] || top < vec[0]) {
                continue;
            }
            */
            Drawable.sampleColor4b(vec, drawables[index].drawable, __blendColor);
            // Equivalent to gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
            dst[0] += __blendColor[0] * blendAlpha;
            dst[1] += __blendColor[1] * blendAlpha;
            dst[2] += __blendColor[2] * blendAlpha;
            blendAlpha *= (1 - (__blendColor[3] / 255));
        }
        // Backdrop could be transparent, so we need to go to the "clear color" of the
        // draw scene (white) as a fallback if everything was alpha
        dst[0] += blendAlpha * 255;
        dst[1] += blendAlpha * 255;
        dst[2] += blendAlpha * 255;
        return dst;
    }

    /**
     * @callback RenderWebGL#snapshotCallback
     * @param {string} dataURI Data URI of the snapshot of the renderer
     */

    /**
     * @param {snapshotCallback} callback Function called in the next frame with the snapshot data
     */
    requestSnapshot (callback) {
        this._snapshotCallbacks.push(callback);
    }
}

// :3
RenderWebGL.prototype.canHazPixels = RenderWebGL.prototype.extractDrawableScreenSpace;

/**
 * Values for setUseGPU()
 * @enum {string}
 */
RenderWebGL.UseGpuModes = {
    /**
     * Heuristically decide whether to use the GPU path, the CPU path, or a dynamic mixture of the two.
     */
    Automatic: 'Automatic',

    /**
     * Always use the GPU path.
     */
    ForceGPU: 'ForceGPU',

    /**
     * Always use the CPU path.
     */
    ForceCPU: 'ForceCPU'
};

module.exports = RenderWebGL;
