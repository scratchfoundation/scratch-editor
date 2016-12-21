const twgl = require('twgl.js');

const Drawable = require('./Drawable');


class PenDrawable extends Drawable {
    /**
     * Create a Pen Layer.
     * @param {WebGLRenderingContext} gl - The WebGL rendering context to use.
     */
    constructor (gl) {
        super(gl);

        /** @type {HTMLCanvasElement} */
        this._canvas = document.createElement('canvas');

        /** @type {boolean} */
        this._canvasDirty = false;
    }

    /**
     * Resize the pen layer's working area.
     * @param {int} width - The new width of the working area.
     * @param {int} height - The new height of the working area.
     */
    resize (width, height) {
        const gl = this._gl;
        this._canvas.width = width;
        this._canvas.height = height;
        this._rotationCenter = [width / 2.0, height / 2.0];
        this._uniforms.u_skinSize = [width, height];
        this._uniforms.u_skin = twgl.createTexture(
            gl,
            {
                auto: true,
                mag: gl.NEAREST,
                min: gl.NEAREST,
                wrap: gl.CLAMP_TO_EDGE,
                src: this._canvas
            }
        );
        this._canvasDirty = true;
        this.setTransformDirty();

        const ctx = this._canvas.getContext('2d');
        ctx.strokeStyle = 'red';
        ctx.beginPath();
        ctx.moveTo(-2, 0);
        ctx.lineTo(width - 2, height);
        ctx.stroke();
        ctx.strokeStyle = 'green';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(width + 0, height);
        ctx.stroke();
        ctx.strokeStyle = 'blue';
        ctx.beginPath();
        ctx.moveTo(2, 0);
        ctx.lineTo(width + 2, height);
        ctx.stroke();
        ctx.strokeStyle = 'purple';
        ctx.moveTo(2, height / 10);
        ctx.lineTo(width / 10, height / 5);
        ctx.stroke();
    }

    /**
     * Prepare this object to draw: update uniforms, textures, etc.
     */
    prepareToDraw () {
        if (this._canvasDirty) {
            this._canvasDirty = false;

            const gl = this._gl;
            gl.bindTexture(gl.TEXTURE_2D, this._uniforms.u_skin);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this._canvas);
        }
    }
}

module.exports = PenDrawable;
