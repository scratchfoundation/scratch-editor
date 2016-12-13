const hull = require('hull.js');
const twgl = require('twgl.js');

const Drawable = require('./Drawable');
const ShaderManager = require('./ShaderManager');

/**
 * Maximum touch size for a picking check.
 * TODO: Figure out a reasonable max size. Maybe this should be configurable?
 * @type {int[]}
 */
const MAX_TOUCH_SIZE = [3, 3];

/**
 * "touching {color}?" or "{color} touching {color}?" tests will be true if the
 * target is touching a color whose components are each within this tolerance of
 * the corresponding component of the query color.
 * @type {int} between 0 (exact matches only) and 255 (match anything).
 */
const TOLERANCE_TOUCHING_COLOR = 2;


class RenderWebGL {
    /**
     * Create a renderer for drawing Scratch sprites to a canvas using WebGL.
     * Coordinates will default to Scratch 2.0 values if unspecified.
     * The stage's "native" size will be calculated from the these coordinates.
     * For example, the defaults result in a native size of 480x360.
     * Queries such as "touching color?" will always execute at the native size.
     * @see setStageSize
     * @see resize
     * @param {canvas} canvas The canvas to draw onto.
     * @param {int} [xLeft=-240] The x-coordinate of the left edge.
     * @param {int} [xRight=240] The x-coordinate of the right edge.
     * @param {int} [yBottom=-180] The y-coordinate of the bottom edge.
     * @param {int} [yTop=180] The y-coordinate of the top edge.
     * @constructor
     */
    constructor (canvas, xLeft, xRight, yBottom, yTop) {
        // TODO: remove?
        twgl.setDefaults({crossOrigin: true});

        this._gl = twgl.getWebGLContext(canvas, {alpha: false, stencil: true});
        this._drawables = [];
        this._projection = twgl.m4.identity();

        this._createGeometry();

        this.setBackgroundColor(1, 1, 1);
        this.setStageSize(xLeft || -240, xRight || 240, yBottom || -180, yTop || 180);
        this.resize(this._nativeSize[0], this._nativeSize[1]);
        this._createQueryBuffers();

        const gl = this._gl;
        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND); // TODO: disable when no partial transparency?
        gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);
        this._shaderManager = new ShaderManager(gl);
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
        this._nativeSize = [Math.abs(xRight - xLeft), Math.abs(yBottom - yTop)];
        this._projection = twgl.m4.ortho(xLeft, xRight, yBottom, yTop, -1, 1);
    }

    /**
     * Create a new Drawable and add it to the scene.
     * @returns {int} The ID of the new Drawable.
     */
    createDrawable () {
        const drawable = new Drawable(this._gl);
        const drawableID = drawable.getID();
        this._drawables.push(drawableID);
        return drawableID;
    }

    /**
     * Destroy a Drawable, removing it from the scene.
     * @param {int} drawableID The ID of the Drawable to remove.
     * @returns {boolean} True iff the drawable was found and removed.
     */
    destroyDrawable (drawableID) {
        const index = this._drawables.indexOf(drawableID);
        if (index >= 0) {
            Drawable.getDrawableByID(drawableID).dispose();
            this._drawables.splice(index, 1);
            return true;
        }
        return false;
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
        const oldIndex = this._drawables.indexOf(drawableID);
        if (oldIndex >= 0) {
            // Remove drawable from the list.
            const drawable = this._drawables.splice(oldIndex, 1)[0];
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
            this._drawables.splice(newIndex, 0, drawable);
            return this._drawables.indexOf(drawable);
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

        this._drawThese(this._drawables, ShaderManager.DRAW_MODE.default, this._projection);
    }

    /**
     * Get the precise bounds for a Drawable.
     * @param {int} drawableID ID of Drawable to get bounds for.
     * @return {object} Bounds for a tight box around the Drawable.
     */
    getBounds (drawableID) {
        const drawable = Drawable.getDrawableByID(drawableID);
        // Tell the Drawable about its updated convex hull, if necessary.
        if (drawable.needsConvexHullPoints()) {
            const points = this._getConvexHullPointsForDrawable(drawableID);
            drawable.setConvexHullPoints(points);
        }
        const bounds = drawable.getBounds();
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
     * @return {Array.<number>} Skin size, width and height.
     */
    getSkinSize (drawableID) {
        const drawable = Drawable.getDrawableByID(drawableID);
        return drawable.getSkinSize();
    }

    /**
     * Check if a particular Drawable is touching a particular color.
     * @param {int} drawableID The ID of the Drawable to check.
     * @param {int[]} color3b Test if the Drawable is touching this color.
     * @param {int[]} [mask3b] Optionally mask the check to this part of Drawable.
     * @returns {boolean} True iff the Drawable is touching the color.
     */
    isTouchingColor (drawableID, color3b, mask3b) {
        const gl = this._gl;
        twgl.bindFramebufferInfo(gl, this._queryBufferInfo);

        const bounds = this._touchingBounds(drawableID);
        if (!bounds) {
            return;
        }
        const candidateIDs = this._filterCandidatesTouching(drawableID, this._drawables, bounds);
        if (!candidateIDs) {
            return;
        }


        // Limit size of viewport to the bounds around the target Drawable,
        // and create the projection matrix for the draw.
        gl.viewport(0, 0, bounds.width, bounds.height);
        const projection = twgl.m4.ortho(bounds.left, bounds.right, bounds.bottom, bounds.top, -1, 1);

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
                null,
                extraUniforms);

            gl.stencilFunc(gl.EQUAL, 1, 1);
            gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
            gl.colorMask(true, true, true, true);

            this._drawThese(candidateIDs, ShaderManager.DRAW_MODE.default, projection,
                testID => testID !== drawableID
            );
        } finally {
            gl.colorMask(true, true, true, true);
            gl.disable(gl.STENCIL_TEST);
        }

        const pixels = new Buffer(bounds.width * bounds.height * 4);
        gl.readPixels(0, 0, bounds.width, bounds.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        if (this._debugCanvas) {
            this._debugCanvas.width = bounds.width;
            this._debugCanvas.height = bounds.height;
            const context = this._debugCanvas.getContext('2d');
            const imageData = context.getImageData(0, 0, bounds.width, bounds.height);
            for (let i = 0, bytes = pixels.length; i < bytes; ++i) {
                imageData.data[i] = pixels[i];
            }
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
     * @param {int[]} candidateIDs The Drawable IDs to check, otherwise all.
     * @returns {boolean} True iff the Drawable is touching one of candidateIDs.
     */
    isTouchingDrawables (drawableID, candidateIDs) {
        candidateIDs = candidateIDs || this._drawables;

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
        const projection = twgl.m4.ortho(bounds.left, bounds.right, bounds.bottom, bounds.top, -1, 1);

        const noneColor = Drawable.color4fFromID(Drawable.NONE);
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
                testID => testID !== drawableID
            );
        } finally {
            gl.colorMask(true, true, true, true);
            gl.disable(gl.STENCIL_TEST);
        }

        const pixels = new Buffer(bounds.width * bounds.height * 4);
        gl.readPixels(0, 0, bounds.width, bounds.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        if (this._debugCanvas) {
            this._debugCanvas.width = bounds.width;
            this._debugCanvas.height = bounds.height;
            const context = this._debugCanvas.getContext('2d');
            const imageData = context.getImageData(0, 0, bounds.width, bounds.height);
            for (let i = 0, bytes = pixels.length; i < bytes; ++i) {
                imageData.data[i] = pixels[i];
            }
            context.putImageData(imageData, 0, 0);
        }

        for (let pixelBase = 0; pixelBase < pixels.length; pixelBase += 4) {
            const pixelID = Drawable.color4bToID(
                pixels[pixelBase],
                pixels[pixelBase + 1],
                pixels[pixelBase + 2],
                pixels[pixelBase + 3]);
            if (pixelID > Drawable.NONE) {
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
     * @param {int[]} candidateIDs The Drawable IDs to pick from, otherwise all.
     * @returns {int} The ID of the topmost Drawable under the picking location, or
     * Drawable.NONE if there is no Drawable at that location.
     */
    pick (centerX, centerY, touchWidth, touchHeight, candidateIDs) {
        const gl = this._gl;

        touchWidth = touchWidth || 1;
        touchHeight = touchHeight || 1;
        candidateIDs = candidateIDs || this._drawables;

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

        const noneColor = Drawable.color4fFromID(Drawable.NONE);
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

        const pixels = new Buffer(touchWidth * touchHeight * 4);
        gl.readPixels(0, 0, touchWidth, touchHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        if (this._debugCanvas) {
            this._debugCanvas.width = touchWidth;
            this._debugCanvas.height = touchHeight;
            const context = this._debugCanvas.getContext('2d');
            const imageData = context.getImageData(0, 0, touchWidth, touchHeight);
            for (let i = 0, bytes = pixels.length; i < bytes; ++i) {
                imageData.data[i] = pixels[i];
            }
            context.putImageData(imageData, 0, 0);
        }

        const hits = {};
        for (let pixelBase = 0; pixelBase < pixels.length; pixelBase += 4) {
            const pixelID = Drawable.color4bToID(
                pixels[pixelBase],
                pixels[pixelBase + 1],
                pixels[pixelBase + 2],
                pixels[pixelBase + 3]);
            hits[pixelID] = (hits[pixelID] || 0) + 1;
        }

        // Bias toward selecting anything over nothing
        hits[Drawable.NONE] = 0;

        let hit = Drawable.NONE;
        for (const hitID in hits) {
            if (hits.hasOwnProperty(hitID) && (hits[hitID] > hits[hit])) {
                hit = hitID;
            }
        }

        return hit | 0;
    }

    /**
     * Get the candidate bounding box for a touching query.
     * @param {int} drawableID ID for drawable of query.
     * @return {?Rectangle} Rectangle bounds for touching query, or null.
     */
    _touchingBounds (drawableID) {
        const drawable = Drawable.getDrawableByID(drawableID);
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
     * @param {Array.<int>} candidateIDs - Candidates for touching query.
     * @param {Rectangle} bounds - Bounds to limit candidates to.
     * @return {?Array.<int>} Filtered candidateIDs, or null if none.
     */
    _filterCandidatesTouching (drawableID, candidateIDs, bounds) {
        // Filter candidates by rough bounding box intersection.
        // Do this before _drawThese, so we can prevent any GL operations
        // and readback by returning early.
        candidateIDs = candidateIDs.filter(testID => {
            if (testID === drawableID) return false;
            // Only draw items which could possibly overlap target Drawable.
            const candidate = Drawable.getDrawableByID(testID);
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
        const drawable = Drawable.getDrawableByID(drawableID);
        drawable.updateProperties(properties);
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
     * Create the frame buffers used for queries such as picking and color-touching.
     * These buffers are fixed in size regardless of the size of the main render
     * target. The fixed size allows (more) consistent behavior across devices and
     * presentation modes.
     * @private
     */
    _createQueryBuffers () {
        const gl = this._gl;
        const attachments = [
            {format: gl.RGBA},
            {format: gl.DEPTH_STENCIL}
        ];

        this._pickBufferInfo = twgl.createFramebufferInfo(gl, attachments, MAX_TOUCH_SIZE[0], MAX_TOUCH_SIZE[1]);

        // TODO: should we create this on demand to save memory?
        // A 480x360 32-bpp buffer is 675 KiB.
        this._queryBufferInfo = twgl.createFramebufferInfo(gl, attachments, this._nativeSize[0], this._nativeSize[1]);
    }

    /**
     * Draw all Drawables, with the possible exception of
     * @param {int[]} drawables The Drawable IDs to draw, possibly this._drawables.
     * @param {ShaderManager.DRAW_MODE} drawMode Draw normally, silhouette, etc.
     * @param {module:twgl/m4.Mat4} projection The projection matrix to use.
     * @param {Drawable~idFilterFunc} [filter] An optional filter function.
     * @param {Object.<string,*>} [extraUniforms] Extra uniforms for the shaders.
     * @private
     */
    _drawThese (drawables, drawMode, projection, filter, extraUniforms) {
        const gl = this._gl;
        let currentShader = null;

        const numDrawables = drawables.length;
        for (let drawableIndex = 0; drawableIndex < numDrawables; ++drawableIndex) {
            const drawableID = drawables[drawableIndex];

            // If we have a filter, check whether the ID fails
            if (filter && !filter(drawableID)) continue;

            const drawable = Drawable.getDrawableByID(drawableID);
            // TODO: check if drawable is inside the viewport before anything else

            // Hidden drawables (e.g., by a "hide" block) are never drawn.
            if (!drawable.getVisible()) continue;

            const effectBits = drawable.getEnabledEffects();
            const newShader = this._shaderManager.getShader(drawMode, effectBits);
            if (currentShader !== newShader) {
                currentShader = newShader;
                gl.useProgram(currentShader.program);
                twgl.setBuffersAndAttributes(gl, currentShader, this._bufferInfo);
                twgl.setUniforms(currentShader, {u_projectionMatrix: projection});
                twgl.setUniforms(currentShader, {u_fudge: window.fudge || 0});
            }

            twgl.setUniforms(currentShader, drawable.getUniforms());

            // Apply extra uniforms after the Drawable's, to allow overwriting.
            if (extraUniforms) {
                twgl.setUniforms(currentShader, extraUniforms);
            }

            twgl.drawBufferInfo(gl, gl.TRIANGLES, this._bufferInfo);
        }
    }

    /**
     * Get the convex hull points for a particular Drawable.
     * To do this, draw the Drawable unrotated, unscaled, and untranslated.
     * Read back the pixels and find all boundary points.
     * Finally, apply a convex hull algorithm to simplify the set.
     * @param {int} drawableID The Drawable IDs calculate convex hull for.
     * @return {Array.<Array.<number>>} points Convex hull points, as [[x, y], ...]
     */
    _getConvexHullPointsForDrawable (drawableID) {
        const drawable = Drawable.getDrawableByID(drawableID);
        const [width, height] = drawable._uniforms.u_skinSize;
        // No points in the hull if invisible or size is 0.
        if (!drawable.getVisible() || width === 0 || height === 0) {
            return [];
        }

        // Only draw to the size of the untransformed drawable.
        const gl = this._gl;
        twgl.bindFramebufferInfo(gl, this._queryBufferInfo);
        gl.viewport(0, 0, width, height);

        // Clear the canvas with Drawable.NONE.
        const noneColor = Drawable.color4fFromID(Drawable.NONE);
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
            null,
            {u_modelMatrix: modelMatrix}
        );

        const pixels = new Buffer(width * height * 4);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        // Known boundary points on left/right edges of pixels.
        const boundaryPoints = [];

        /**
         * Helper method to look up a pixel.
         * @param {int} x X coordinate of the pixel in `pixels`.
         * @param {int} y Y coordinate of the pixel in `pixels`.
         * @return {int} Known ID at that pixel, or Drawable.NONE.
         */
        const _getPixel = (x, y) => {
            const pixelBase = ((width * y) + x) * 4;
            return Drawable.color4bToID(
                pixels[pixelBase],
                pixels[pixelBase + 1],
                pixels[pixelBase + 2],
                pixels[pixelBase + 3]);
        };
        for (let y = 0; y <= height; y++) {
            // Scan from left.
            for (let x = 0; x < width; x++) {
                if (_getPixel(x, y) > Drawable.NONE) {
                    boundaryPoints.push([x, y]);
                    break;
                }
            }
            // Scan from right.
            for (let x = width - 1; x >= 0; x--) {
                if (_getPixel(x, y) > Drawable.NONE) {
                    boundaryPoints.push([x, y]);
                    break;
                }
            }
        }
        // Simplify boundary points using convex hull.
        return hull(boundaryPoints, Infinity);
    }
}

module.exports = RenderWebGL;
