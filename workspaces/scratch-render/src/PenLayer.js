const twgl = require('twgl.js');

const vertexShaderText = require('./shaders/pen.vert');
const fragmentShaderText = require('./shaders/pen.frag');


class PenLayer {
    /**
     * Create a Pen Layer.
     * @param {WebGLRenderingContext} gl - The WebGL rendering context to use.
     */
    constructor (gl) {
        /** @type {WebGLRenderingContext} */
        this._gl = gl;

        /** @type {HTMLCanvasElement} */
        this._canvas = document.createElement('canvas');

        /** @type {boolean} */
        this._textureDirty = false;

        /** @type {DrawObject[]} */
        this._drawObjects = [{
            type: gl.TRIANGLE_STRIP,
            programInfo: twgl.createProgramInfo(gl, [vertexShaderText, fragmentShaderText]),
            bufferInfo: twgl.createBufferInfoFromArrays(gl, {
                a_texCoord: {
                    numComponents: 2,
                    data: [
                        1, 0,
                        0, 0,
                        1, 1,
                        0, 1
                    ]
                }
            }),
            uniforms: {
                /** @type {WebGLTexture} */
                u_penLayer: null
            }
        }];
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
        this._texture = twgl.createTexture(
            gl,
            {
                auto: true,
                mag: gl.NEAREST,
                min: gl.NEAREST,
                wrap: gl.CLAMP_TO_EDGE,
                src: this._canvas
            }
        );
        this._textureDirty = true;

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
     * Draw the pen layer onto the current frame buffer.
     */
    draw () {
        if (this._texture) {
            const gl = this._gl;
            if (this._textureDirty) {
                this._textureDirty = false;
                gl.bindTexture(gl.TEXTURE_2D, this._texture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this._canvas);
            }
            twgl.drawObjectList(gl, this._drawObjects);
        }
    }

    /** @returns {WebGLTexture} The current pen layer texture. */
    get _texture () {
        return this._drawObjects[0].uniforms.u_penLayer;
    }

    /** @param {WebGLTexture} newTexture - The new pen layer texture. */
    set _texture (newTexture) {
        this._drawObjects[0].uniforms.u_penLayer = newTexture;
    }
}

module.exports = PenLayer;
