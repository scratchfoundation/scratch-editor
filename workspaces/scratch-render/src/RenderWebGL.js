const EventEmitter = require('events');

const hull = require('hull.js');
const twgl = require('twgl.js');

const BitmapSkin = require('./BitmapSkin');
const Drawable = require('./Drawable');
const PenSkin = require('./PenSkin');
const RenderConstants = require('./RenderConstants');
const ShaderManager = require('./ShaderManager');
const SVGSkin = require('./SVGSkin');

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
 * "touching {color}?" or "{color} touching {color}?" tests will be true if the
 * target is touching a color whose components are each within this tolerance of
 * the corresponding component of the query color.
 * between 0 (exact matches only) and 255 (match anything).
 * @type {int}
 * @memberof RenderWebGL
 */
const TOLERANCE_TOUCHING_COLOR = 2;

/**
 * Sprite Fencing - The number of pixels a sprite is required to leave remaining
 * onscreen around the edge of the staging area.
 * @type {number}
 */
const FENCE_WIDTH = 15;


class RenderWebGL extends EventEmitter {
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

        /** @type {Drawable[]} */
        this._allDrawables = [];

        /** @type {Skin[]} */
        this._allSkins = [];

        /** @type {Array<int>} */
        this._drawList = [];

        /** @type {WebGLRenderingContext} */
        const gl = this._gl = twgl.getWebGLContext(canvas, {alpha: false, stencil: true});

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

        this._createGeometry();

        this.on(RenderConstants.Events.NativeSizeChanged, this.onNativeSizeChanged);

        this.setBackgroundColor(1, 1, 1);
        this.setStageSize(xLeft || -240, xRight || 240, yBottom || -180, yTop || 180);
        this.resize(this._nativeSize[0], this._nativeSize[1]);

        gl.disable(gl.DEPTH_TEST);
        /** @todo disable when no partial transparency? */
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);
    }

    /**
     * @returns {WebGLRenderingContext} the WebGL rendering context associated with this renderer.
     */
    get gl () {
        return this._gl;
    }

    /**
     * Set the physical size of the stage in device-independent pixels.
     * This will be multiplied by the device's pixel ratio on high-DPI displays.
     * @param {int} pixelsWide The desired width in device-independent pixels.
     * @param {int} pixelsTall The desired height in device-independent pixels.
     */
    resize (pixelsWide, pixelsTall) {
        const pixelRatio = window.devicePixelRatio || 1;
        this._gl.canvas.width = pixelsWide * pixelRatio;
        this._gl.canvas.height = pixelsTall * pixelRatio;
    }

    /**
     * Set the background color for the stage. The stage will be cleared with this
     * color each frame.
     * @param {number} red The red component for the background.
     * @param {number} green The green component for the background.
     * @param {number} blue The blue component for the background.
     */
    setBackgroundColor (red, green, blue) {
        this._backgroundColor = [red, green, blue, 1];
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
     * @param {?Array<number>} rotationCenter Optional: rotation center of the skin. If not supplied, the center of the
     * skin will be used
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
        const oldSkin = this._allSkins[skinId];
        this._allSkins[skinId] = newSkin;
        oldSkin.dispose();
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
     * @returns {int} The ID of the new Drawable.
     */
    createDrawable () {
        const drawableID = this._nextDrawableId++;
        const drawable = new Drawable(drawableID);
        this._allDrawables[drawableID] = drawable;
        this._drawList.push(drawableID);

        drawable.skin = null;

        return drawableID;
    }

    /**
     * Destroy a Drawable, removing it from the scene.
     * @param {int} drawableID The ID of the Drawable to remove.
     */
    destroyDrawable (drawableID) {
        const drawable = this._allDrawables[drawableID];
        drawable.dispose();
        delete this._allDrawables[drawableID];

        let index;
        while ((index = this._drawList.indexOf(drawableID)) >= 0) {
            this._drawList.splice(index, 1);
        }
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
     * @param {boolean=} optIsRelative If set, `order` refers to a relative change.
     * @param {number=} optMin If set, order constrained to be at least `optMin`.
     * @return {?number} New order if changed, or null.
     */
    setDrawableOrder (drawableID, order, optIsRelative, optMin) {
        const oldIndex = this._drawList.indexOf(drawableID);
        if (oldIndex >= 0) {
            // Remove drawable from the list.
            const drawable = this._drawList.splice(oldIndex, 1)[0];
            // Determine new index.
            let newIndex = order;
            if (optIsRelative) {
                newIndex += oldIndex;
            }
            if (optMin) {
                newIndex = Math.max(newIndex, optMin);
            }
            newIndex = Math.max(newIndex, 0);
            // Insert at new index.
            this._drawList.splice(newIndex, 0, drawable);
            return this._drawList.indexOf(drawable);
        }
        return null;
    }

    /**
     * Draw all current drawables and present the frame on the canvas.
     */
    draw () {
        const gl = this._gl;

        twgl.bindFramebufferInfo(gl, null);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor.apply(gl, this._backgroundColor);
        gl.clear(gl.COLOR_BUFFER_BIT);

        this._drawThese(this._drawList, ShaderManager.DRAW_MODE.default, this._projection);
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
     * Get the current skin (costume) size of a Drawable.
     * @param {int} drawableID The ID of the Drawable to measure.
     * @return {Array<number>} Skin size, width and height.
     */
    getSkinSize (drawableID) {
        const drawable = this._allDrawables[drawableID];
        return drawable.skin.size;
    }

    /**
     * Check if a particular Drawable is touching a particular color.
     * @param {int} drawableID The ID of the Drawable to check.
     * @param {Array<int>} color3b Test if the Drawable is touching this color.
     * @param {Array<int>} [mask3b] Optionally mask the check to this part of Drawable.
     * @returns {boolean} True iff the Drawable is touching the color.
     */
    isTouchingColor (drawableID, color3b, mask3b) {
        const gl = this._gl;
        twgl.bindFramebufferInfo(gl, this._queryBufferInfo);

        const bounds = this._touchingBounds(drawableID);
        if (!bounds) {
            return;
        }
        const candidateIDs = this._filterCandidatesTouching(drawableID, this._drawList, bounds);
        if (!candidateIDs) {
            return;
        }

        // Limit size of viewport to the bounds around the target Drawable,
        // and create the projection matrix for the draw.
        gl.viewport(0, 0, bounds.width, bounds.height);
        const projection = twgl.m4.ortho(bounds.left, bounds.right, bounds.top, bounds.bottom, -1, 1);

        gl.clearColor.apply(gl, this._backgroundColor);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

        let extraUniforms;
        if (mask3b) {
            extraUniforms = {
                u_colorMask: [mask3b[0] / 255, mask3b[1] / 255, mask3b[2] / 255],
                u_colorMaskTolerance: TOLERANCE_TOUCHING_COLOR / 255
            };
        }

        try {
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
                {extraUniforms});

            gl.stencilFunc(gl.EQUAL, 1, 1);
            gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
            gl.colorMask(true, true, true, true);

            this._drawThese(candidateIDs, ShaderManager.DRAW_MODE.default, projection,
                {idFilterFunc: testID => testID !== drawableID}
            );
        } finally {
            gl.colorMask(true, true, true, true);
            gl.disable(gl.STENCIL_TEST);
        }

        const pixels = new Uint8Array(Math.floor(bounds.width * bounds.height * 4));
        gl.readPixels(0, 0, bounds.width, bounds.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        if (this._debugCanvas) {
            this._debugCanvas.width = bounds.width;
            this._debugCanvas.height = bounds.height;
            const context = this._debugCanvas.getContext('2d');
            const imageData = context.getImageData(0, 0, bounds.width, bounds.height);
            imageData.data.set(pixels);
            context.putImageData(imageData, 0, 0);
        }

        for (let pixelBase = 0; pixelBase < pixels.length; pixelBase += 4) {
            const pixelDistanceR = Math.abs(pixels[pixelBase] - color3b[0]);
            const pixelDistanceG = Math.abs(pixels[pixelBase + 1] - color3b[1]);
            const pixelDistanceB = Math.abs(pixels[pixelBase + 2] - color3b[2]);

            if (pixelDistanceR <= TOLERANCE_TOUCHING_COLOR &&
                pixelDistanceG <= TOLERANCE_TOUCHING_COLOR &&
                pixelDistanceB <= TOLERANCE_TOUCHING_COLOR) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if a particular Drawable is touching any in a set of Drawables.
     * @param {int} drawableID The ID of the Drawable to check.
     * @param {Array<int>} candidateIDs The Drawable IDs to check, otherwise all.
     * @returns {boolean} True iff the Drawable is touching one of candidateIDs.
     */
    isTouchingDrawables (drawableID, candidateIDs) {
        candidateIDs = candidateIDs || this._drawList;

        const gl = this._gl;

        twgl.bindFramebufferInfo(gl, this._queryBufferInfo);

        const bounds = this._touchingBounds(drawableID);
        if (!bounds) {
            return;
        }
        candidateIDs = this._filterCandidatesTouching(drawableID, candidateIDs, bounds);
        if (!candidateIDs) {
            return;
        }

        // Limit size of viewport to the bounds around the target Drawable,
        // and create the projection matrix for the draw.
        gl.viewport(0, 0, bounds.width, bounds.height);
        const projection = twgl.m4.ortho(bounds.left, bounds.right, bounds.top, bounds.bottom, -1, 1);

        const noneColor = Drawable.color4fFromID(RenderConstants.ID_NONE);
        gl.clearColor.apply(gl, noneColor);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

        try {
            gl.enable(gl.STENCIL_TEST);
            gl.stencilFunc(gl.ALWAYS, 1, 1);
            gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
            gl.colorMask(false, false, false, false);
            this._drawThese([drawableID], ShaderManager.DRAW_MODE.silhouette, projection);

            gl.stencilFunc(gl.EQUAL, 1, 1);
            gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
            gl.colorMask(true, true, true, true);

            this._drawThese(candidateIDs, ShaderManager.DRAW_MODE.silhouette, projection,
                {idFilterFunc: testID => testID !== drawableID}
            );
        } finally {
            gl.colorMask(true, true, true, true);
            gl.disable(gl.STENCIL_TEST);
        }

        const pixels = new Uint8Array(Math.floor(bounds.width * bounds.height * 4));
        gl.readPixels(0, 0, bounds.width, bounds.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        if (this._debugCanvas) {
            this._debugCanvas.width = bounds.width;
            this._debugCanvas.height = bounds.height;
            const context = this._debugCanvas.getContext('2d');
            const imageData = context.getImageData(0, 0, bounds.width, bounds.height);
            imageData.data.set(pixels);
            context.putImageData(imageData, 0, 0);
        }

        for (let pixelBase = 0; pixelBase < pixels.length; pixelBase += 4) {
            const pixelID = Drawable.color3bToID(
                pixels[pixelBase],
                pixels[pixelBase + 1],
                pixels[pixelBase + 2]);
            if (pixelID > RenderConstants.ID_NONE) {
                return true;
            }
        }

        return false;
    }

    /**
     * Detect which sprite, if any, is at the given location.
     * @param {int} centerX The client x coordinate of the picking location.
     * @param {int} centerY The client y coordinate of the picking location.
     * @param {int} touchWidth The client width of the touch event (optional).
     * @param {int} touchHeight The client height of the touch event (optional).
     * @param {Array<int>} candidateIDs The Drawable IDs to pick from, otherwise all.
     * @returns {int} The ID of the topmost Drawable under the picking location, or
     * RenderConstants.ID_NONE if there is no Drawable at that location.
     */
    pick (centerX, centerY, touchWidth, touchHeight, candidateIDs) {
        const gl = this._gl;

        touchWidth = touchWidth || 1;
        touchHeight = touchHeight || 1;
        candidateIDs = candidateIDs || this._drawList;

        const clientToGLX = gl.canvas.width / gl.canvas.clientWidth;
        const clientToGLY = gl.canvas.height / gl.canvas.clientHeight;

        centerX *= clientToGLX;
        centerY *= clientToGLY;
        touchWidth *= clientToGLX;
        touchHeight *= clientToGLY;

        touchWidth = Math.max(1, Math.min(touchWidth, MAX_TOUCH_SIZE[0]));
        touchHeight = Math.max(1, Math.min(touchHeight, MAX_TOUCH_SIZE[1]));

        const pixelLeft = Math.floor(centerX - Math.floor(touchWidth / 2) + 0.5);
        const pixelRight = Math.floor(centerX + Math.ceil(touchWidth / 2) + 0.5);
        const pixelTop = Math.floor(centerY - Math.floor(touchHeight / 2) + 0.5);
        const pixelBottom = Math.floor(centerY + Math.ceil(touchHeight / 2) + 0.5);

        twgl.bindFramebufferInfo(gl, this._pickBufferInfo);
        gl.viewport(0, 0, touchWidth, touchHeight);

        const noneColor = Drawable.color4fFromID(RenderConstants.ID_NONE);
        gl.clearColor.apply(gl, noneColor);
        gl.clear(gl.COLOR_BUFFER_BIT);

        const widthPerPixel = (this._xRight - this._xLeft) / this._gl.canvas.width;
        const heightPerPixel = (this._yBottom - this._yTop) / this._gl.canvas.height;

        const pickLeft = this._xLeft + (pixelLeft * widthPerPixel);
        const pickRight = this._xLeft + (pixelRight * widthPerPixel);
        const pickTop = this._yTop + (pixelTop * heightPerPixel);
        const pickBottom = this._yTop + (pixelBottom * heightPerPixel);

        const projection = twgl.m4.ortho(pickLeft, pickRight, pickTop, pickBottom, -1, 1);

        this._drawThese(candidateIDs, ShaderManager.DRAW_MODE.silhouette, projection);

        const pixels = new Uint8Array(Math.floor(touchWidth * touchHeight * 4));
        gl.readPixels(0, 0, touchWidth, touchHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        if (this._debugCanvas) {
            this._debugCanvas.width = touchWidth;
            this._debugCanvas.height = touchHeight;
            const context = this._debugCanvas.getContext('2d');
            const imageData = context.getImageData(0, 0, touchWidth, touchHeight);
            imageData.data.set(pixels);
            context.putImageData(imageData, 0, 0);
        }

        const hits = {};
        for (let pixelBase = 0; pixelBase < pixels.length; pixelBase += 4) {
            const pixelID = Drawable.color3bToID(
                pixels[pixelBase],
                pixels[pixelBase + 1],
                pixels[pixelBase + 2]);
            hits[pixelID] = (hits[pixelID] || 0) + 1;
        }

        // Bias toward selecting anything over nothing
        hits[RenderConstants.ID_NONE] = 0;

        let hit = RenderConstants.ID_NONE;
        for (const hitID in hits) {
            if (hits.hasOwnProperty(hitID) && (hits[hitID] > hits[hit])) {
                hit = hitID;
            }
        }

        return hit | 0;
    }

    /**
     * @typedef DrawableExtraction
     * @property {Uint8Array} data Raw pixel data for the drawable
     * @property {int} width Drawable bounding box width
     * @property {int} height Drawable bounding box height
     * @property {Array<number>} scratchOffset [x, y] offset in Scratch coordinates
     * from the drawable position to the client x, y coordinate
     * @property {int} x The x coordinate relative to drawable bounding box
     * @property {int} y The y coordinate relative to drawable bounding box
     */

    /**
     * Return drawable pixel data and picking coordinates relative to the drawable bounds
     * @param {int} drawableID The ID of the drawable to get pixel data for
     * @param {int} x The client x coordinate of the picking location.
     * @param {int} y The client y coordinate of the picking location.
     * @return {?DrawableExtraction} Data about the picked drawable
     */
    extractDrawable (drawableID, x, y) {
        const drawable = this._allDrawables[drawableID];
        if (!drawable) return null;

        // Convert client coordinates into absolute scratch units
        const scratchX = this._nativeSize[0] * ((x / this._gl.canvas.clientWidth) - 0.5);
        const scratchY = this._nativeSize[1] * ((y / this._gl.canvas.clientHeight) - 0.5);

        const gl = this._gl;
        twgl.bindFramebufferInfo(gl, this._queryBufferInfo);

        const bounds = drawable.getFastBounds();
        bounds.snapToInt();

        // Translate to scratch units relative to the drawable
        const pickX = scratchX - bounds.left;
        const pickY = scratchY + bounds.top;

        // Limit size of viewport to the bounds around the target Drawable,
        // and create the projection matrix for the draw.
        gl.viewport(0, 0, bounds.width, bounds.height);
        const projection = twgl.m4.ortho(bounds.left, bounds.right, bounds.top, bounds.bottom, -1, 1);

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        try {
            gl.disable(gl.BLEND);
            this._drawThese([drawableID], ShaderManager.DRAW_MODE.default, projection,
                {effectMask: ~ShaderManager.EFFECT_INFO.ghost.mask});
        } finally {
            gl.enable(gl.BLEND);
        }

        const data = new Uint8Array(Math.floor(bounds.width * bounds.height * 4));
        gl.readPixels(0, 0, bounds.width, bounds.height, gl.RGBA, gl.UNSIGNED_BYTE, data);

        if (this._debugCanvas) {
            this._debugCanvas.width = bounds.width;
            this._debugCanvas.height = bounds.height;
            const ctx = this._debugCanvas.getContext('2d');
            const imageData = ctx.createImageData(bounds.width, bounds.height);
            imageData.data.set(data);
            ctx.putImageData(imageData, 0, 0);
            ctx.beginPath();
            ctx.arc(pickX, pickY, 3, 0, 2 * Math.PI, false);
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'black';
            ctx.stroke();
        }

        return {
            data: data,
            width: bounds.width,
            height: bounds.height,
            scratchOffset: [
                -scratchX + drawable._position[0],
                -scratchY - drawable._position[1]
            ],
            x: pickX,
            y: pickY
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
     * @param {Rectangle} bounds - Bounds to limit candidates to.
     * @return {?Array<int>} Filtered candidateIDs, or null if none.
     */
    _filterCandidatesTouching (drawableID, candidateIDs, bounds) {
        // Filter candidates by rough bounding box intersection.
        // Do this before _drawThese, so we can prevent any GL operations
        // and readback by returning early.
        candidateIDs = candidateIDs.filter(testID => {
            if (testID === drawableID) return false;
            // Only draw items which could possibly overlap target Drawable.
            const candidate = this._allDrawables[testID];
            const candidateBounds = candidate.getFastBounds();
            return bounds.intersects(candidateBounds);
        });
        if (candidateIDs.length === 0) {
            // No possible intersections based on bounding boxes.
            return null;
        }
        return candidateIDs;
    }

    /**
     * Update the position, direction, scale, or effect properties of this Drawable.
     * @param {int} drawableID The ID of the Drawable to update.
     * @param {object.<string,*>} properties The new property values to set.
     */
    updateDrawableProperties (drawableID, properties) {
        const drawable = this._allDrawables[drawableID];
        if (!drawable) {
            /**
             * @todo fix whatever's wrong in the VM which causes this, then add a warning or throw here.
             * Right now this happens so much on some projects that a warning or exception here can hang the browser.
             */
            return;
        }
        if ('skinId' in properties) {
            drawable.skin = this._allSkins[properties.skinId];
        }
        if ('rotationCenter' in properties) {
            const newRotationCenter = properties.rotationCenter;
            drawable.skin.setRotationCenter(newRotationCenter[0], newRotationCenter[1]);
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
            // TODO: fix whatever's wrong in the VM which causes this, then add a warning or throw here.
            // Right now this happens so much on some projects that a warning or exception here can hang the browser.
            return [x, y];
        }

        const dx = x - drawable._position[0];
        const dy = y - drawable._position[1];

        const aabb = drawable.getFastBounds();

        const sx = this._xRight - Math.min(FENCE_WIDTH, Math.floor((aabb.right - aabb.left) / 2));
        if (aabb.right + dx < -sx) {
            x = drawable._position[0] - (sx + aabb.right);
        } else if (aabb.left + dx > sx) {
            x = drawable._position[0] + (sx - aabb.left);
        }
        const sy = this._yTop - Math.min(FENCE_WIDTH, Math.floor((aabb.top - aabb.bottom) / 2));
        if (aabb.top + dy < -sy) {
            y = drawable._position[1] - (sy + aabb.top);
        } else if (aabb.bottom + dy > sy) {
            y = drawable._position[1] + (sy - aabb.bottom);
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

        const skin = /** @type {PenSkin} */ this._allSkins[penSkinID];

        const gl = this._gl;
        twgl.bindFramebufferInfo(gl, this._queryBufferInfo);

        // Limit size of viewport to the bounds around the stamp Drawable and create the projection matrix for the draw.
        gl.viewport(0, 0, bounds.width, bounds.height);
        const projection = twgl.m4.ortho(bounds.left, bounds.right, bounds.top, bounds.bottom, -1, 1);

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        try {
            gl.disable(gl.BLEND);
            this._drawThese([stampID], ShaderManager.DRAW_MODE.default, projection, {isStamping: true});
        } finally {
            gl.enable(gl.BLEND);
        }

        const stampPixels = new Uint8Array(Math.floor(bounds.width * bounds.height * 4));
        gl.readPixels(0, 0, bounds.width, bounds.height, gl.RGBA, gl.UNSIGNED_BYTE, stampPixels);

        const stampCanvas = this._tempCanvas;
        stampCanvas.width = bounds.width;
        stampCanvas.height = bounds.height;

        const stampContext = stampCanvas.getContext('2d');
        const stampImageData = stampContext.createImageData(bounds.width, bounds.height);
        stampImageData.data.set(stampPixels);
        stampContext.putImageData(stampImageData, 0, 0);

        skin.drawStamp(stampCanvas, bounds.left, bounds.top);
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
     * Draw a set of Drawables, by drawable ID
     * @param {Array<int>} drawables The Drawable IDs to draw, possibly this._drawList.
     * @param {ShaderManager.DRAW_MODE} drawMode Draw normally, silhouette, etc.
     * @param {module:twgl/m4.Mat4} projection The projection matrix to use.
     * @param {object} [opts] Options for drawing
     * @param {idFilterFunc} opts.filter An optional filter function.
     * @param {object.<string,*>} opts.extraUniforms Extra uniforms for the shaders.
     * @param {int} opts.effectMask Bitmask for effects to allow
     * @param {boolean} opts.isStamping Stamp mode ignores sprite visibility, always drawing.
     * @private
     */
    _drawThese (drawables, drawMode, projection, opts = {}) {
        const gl = this._gl;
        let currentShader = null;

        const numDrawables = drawables.length;
        for (let drawableIndex = 0; drawableIndex < numDrawables; ++drawableIndex) {
            const drawableID = drawables[drawableIndex];

            // If we have a filter, check whether the ID fails
            if (opts.filter && !opts.filter(drawableID)) continue;

            const drawable = this._allDrawables[drawableID];
            /** @todo check if drawable is inside the viewport before anything else */

            // Hidden drawables (e.g., by a "hide" block) are not drawn unless stamping
            if (!drawable.getVisible() && !opts.isStamping) continue;

            const drawableScale = drawable.scale;

            // If the skin or texture isn't ready yet, skip it.
            if (!drawable.skin || !drawable.skin.getTexture(drawableScale)) continue;

            let effectBits = drawable.getEnabledEffects();
            effectBits &= opts.hasOwnProperty('effectMask') ? opts.effectMask : effectBits;
            const newShader = this._shaderManager.getShader(drawMode, effectBits);
            if (currentShader !== newShader) {
                currentShader = newShader;
                gl.useProgram(currentShader.program);
                twgl.setBuffersAndAttributes(gl, currentShader, this._bufferInfo);
                twgl.setUniforms(currentShader, {u_projectionMatrix: projection});
                twgl.setUniforms(currentShader, {u_fudge: window.fudge || 0});
            }

            twgl.setUniforms(currentShader, drawable.skin.getUniforms(drawableScale));
            twgl.setUniforms(currentShader, drawable.getUniforms());

            // Apply extra uniforms after the Drawable's, to allow overwriting.
            if (opts.extraUniforms) {
                twgl.setUniforms(currentShader, opts.extraUniforms);
            }

            twgl.drawBufferInfo(gl, this._bufferInfo, gl.TRIANGLES);
        }
    }

    /**
     * Get the convex hull points for a particular Drawable.
     * To do this, draw the Drawable unrotated, unscaled, and untranslated.
     * Read back the pixels and find all boundary points.
     * Finally, apply a convex hull algorithm to simplify the set.
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

        // Only draw to the size of the untransformed drawable.
        const gl = this._gl;
        twgl.bindFramebufferInfo(gl, this._queryBufferInfo);
        gl.viewport(0, 0, width, height);

        // Clear the canvas with RenderConstants.ID_NONE.
        const noneColor = Drawable.color4fFromID(RenderConstants.ID_NONE);
        gl.clearColor.apply(gl, noneColor);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Overwrite the model matrix to be unrotated, unscaled, untranslated.
        const modelMatrix = twgl.m4.identity();
        twgl.m4.rotateZ(modelMatrix, Math.PI, modelMatrix);
        twgl.m4.scale(modelMatrix, [width, height], modelMatrix);

        const projection = twgl.m4.ortho(-0.5 * width, 0.5 * width, -0.5 * height, 0.5 * height, -1, 1);

        this._drawThese([drawableID],
            ShaderManager.DRAW_MODE.silhouette,
            projection,
            {extraUniforms: {u_modelMatrix: modelMatrix}}
        );

        const pixels = new Uint8Array(Math.floor(width * height * 4));
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        // Known boundary points on left/right edges of pixels.
        const boundaryPoints = [];

        /**
         * Helper method to look up a pixel.
         * @param {int} x X coordinate of the pixel in `pixels`.
         * @param {int} y Y coordinate of the pixel in `pixels`.
         * @return {int} Known ID at that pixel, or RenderConstants.ID_NONE.
         */
        const _getPixel = (x, y) => {
            const pixelBase = Math.round(((width * y) + x) * 4); // Sometimes SVGs don't have int width and height
            return Drawable.color3bToID(
                pixels[pixelBase],
                pixels[pixelBase + 1],
                pixels[pixelBase + 2]);
        };
        for (let y = 0; y <= height; y++) {
            // Scan from left.
            for (let x = 0; x < width; x++) {
                if (_getPixel(x, y) > RenderConstants.ID_NONE) {
                    boundaryPoints.push([x, y]);
                    break;
                }
            }
            // Scan from right.
            for (let x = width - 1; x >= 0; x--) {
                if (_getPixel(x, y) > RenderConstants.ID_NONE) {
                    boundaryPoints.push([x, y]);
                    break;
                }
            }
        }
        // Simplify boundary points using convex hull.
        return hull(boundaryPoints, Infinity);
    }
}

// :3
RenderWebGL.prototype.canHazPixels = RenderWebGL.prototype.extractDrawable;

module.exports = RenderWebGL;
