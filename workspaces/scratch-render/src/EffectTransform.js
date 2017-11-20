/**
 * @fileoverview
 * A utility to transform a texture coordinate to another texture coordinate
 * representing how the shaders apply effects.
 */

const twgl = require('twgl.js');

const ShaderManager = require('./ShaderManager');

/**
 * A texture coordinate is between 0 and 1. 0.5 is the center position.
 * @const {number}
 */
const CENTER_X = 0.5;

/**
 * A texture coordinate is between 0 and 1. 0.5 is the center position.
 * @const {number}
 */
const CENTER_Y = 0.5;

class EffectTransform {
    /**
     * Transform a texture coordinate to one that would be select after applying shader effects.
     * @param {Drawable} drawable The drawable whose effects to emulate.
     * @param {twgl.v3} vec The texture coordinate to transform.
     * @param {?twgl.v3} dst A place to store the output coordinate.
     * @return {twgl.v3} The coordinate after being transform by effects.
     */
    static transformPoint (drawable, vec, dst) {
        dst = dst || twgl.v3.create();
        twgl.v3.copy(vec, dst);

        const uniforms = drawable.getUniforms();
        const effects = drawable.getEnabledEffects();

        if ((effects & ShaderManager.EFFECT_INFO.mosaic.mask) !== 0) {
            // texcoord0 = fract(u_mosaic * texcoord0);
            dst[0] = uniforms.u_mosaic * dst[0] % 1;
            dst[1] = uniforms.u_mosaic * dst[1] % 1;
        }
        if ((effects & ShaderManager.EFFECT_INFO.pixelate.mask) !== 0) {
            const skinUniforms = drawable.skin.getUniforms();
            // vec2 pixelTexelSize = u_skinSize / u_pixelate;
            const texelX = skinUniforms.u_skinSize[0] * uniforms.u_pixelate;
            const texelY = skinUniforms.u_skinSize[1] * uniforms.u_pixelate;
            // texcoord0 = (floor(texcoord0 * pixelTexelSize) + kCenter) /
            //   pixelTexelSize;
            dst[0] = (Math.floor(dst[0] * texelX) + CENTER_X) / texelX;
            dst[1] = (Math.floor(dst[1] * texelY) + CENTER_Y) / texelY;
        }
        if ((effects & ShaderManager.EFFECT_INFO.whirl.mask) !== 0) {
            // const float kRadius = 0.5;
            const RADIUS = 0.5;
            // vec2 offset = texcoord0 - kCenter;
            const offsetX = dst[0] - CENTER_X;
            const offsetY = dst[1] - CENTER_Y;
            // float offsetMagnitude = length(offset);
            const offsetMagnitude = twgl.v3.length(dst);
            // float whirlFactor = max(1.0 - (offsetMagnitude / kRadius), 0.0);
            const whirlFactor = Math.max(1.0 - (offsetMagnitude / RADIUS), 0.0);
            // float whirlActual = u_whirl * whirlFactor * whirlFactor;
            const whirlActual = uniforms.u_whirl * whirlFactor * whirlFactor;
            // float sinWhirl = sin(whirlActual);
            const sinWhirl = Math.sin(whirlActual);
            // float cosWhirl = cos(whirlActual);
            const cosWhirl = Math.cos(whirlActual);
            // mat2 rotationMatrix = mat2(
            //     cosWhirl, -sinWhirl,
            //     sinWhirl, cosWhirl
            // );
            const rot00 = cosWhirl;
            const rot10 = -sinWhirl;
            const rot01 = sinWhirl;
            const rot11 = cosWhirl;

            // texcoord0 = rotationMatrix * offset + kCenter;
            dst[0] = (rot00 * offsetX) + (rot10 * offsetY) + CENTER_X;
            dst[1] = (rot01 * offsetX) + (rot11 * offsetY) + CENTER_Y;
        }
        if ((effects & ShaderManager.EFFECT_INFO.fisheye.mask) !== 0) {
            // vec2 vec = (texcoord0 - kCenter) / kCenter;
            const vX = (dst[0] - CENTER_X) / CENTER_X;
            const vY = (dst[1] - CENTER_Y) / CENTER_Y;
            // float vecLength = length(vec);
            const vLength = Math.sqrt((vX * vX) + (vY * vY));
            // float r = pow(min(vecLength, 1.0), u_fisheye) * max(1.0, vecLength);
            const r = Math.pow(Math.min(vLength, 1), uniforms.u_fisheye) * Math.max(1, vLength);
            // vec2 unit = vec / vecLength;
            const unitX = vX / vLength;
            const unitY = vY / vLength;
            // texcoord0 = kCenter + r * unit * kCenter;
            dst[0] = CENTER_X + (r * unitX * CENTER_X);
            dst[1] = CENTER_Y + (r * unitY * CENTER_Y);
        }

        return dst;
    }
}

module.exports = EffectTransform;
