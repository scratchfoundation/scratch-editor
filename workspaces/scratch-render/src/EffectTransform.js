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

/**
 * Reused memory location for storing an HSV color value.
 * @type {Array<number>}
 */
const __hsv = [0, 0, 0];

/**
 * Converts an RGB color value to HSV. Conversion formula
 * adapted from http://lolengine.net/blog/2013/01/13/fast-rgb-to-hsv.
 * Assumes r, g, and b are in the range [0, 255] and
 * returns h, s, and v in the range [0, 1].
 *
 * @param   {Array<number>} rgb   The RGB color value
 * @param   {number}        rgb.r The red color value
 * @param   {number}        rgb.g The green color value
 * @param   {number}        rgb.b The blue color value
 * @param   {Array<number>} dst   The array to store the RGB values in
 * @return  {Array<number>}       The `dst` array passed in
 */
const rgbToHsv = ([r, g, b], dst) => {
    let K = 0.0;

    r /= 255;
    g /= 255;
    b /= 255;
    let tmp = 0;

    if (g < b) {
        tmp = g;
        g = b;
        b = tmp;

        K = -1;
    }

    if (r < g) {
        tmp = r;
        r = g;
        g = tmp;

        K = (-2 / 6) - K;
    }

    const chroma = r - Math.min(g, b);
    const h = Math.abs(K + ((g - b) / ((6 * chroma) + Number.EPSILON)));
    const s = chroma / (r + Number.EPSILON);
    const v = r;

    dst[0] = h;
    dst[1] = s;
    dst[2] = v;

    return dst;
};

/**
 * Converts an HSV color value to RGB. Conversion formula
 * adapted from https://gist.github.com/mjackson/5311256.
 * Assumes h, s, and v are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   {Array<number>}                hsv The HSV color value
 * @param   {number}                       hsv.h     The hue
 * @param   {number}                       hsv.s     The saturation
 * @param   {number}                       hsv.v     The value
 * @param   {Uint8Array|Uint8ClampedArray} dst The array to store the RGB values in
 * @return  {Uint8Array|Uint8ClampedArray}     The `dst` array passed in
 */
const hsvToRgb = ([h, s, v], dst) => {
    if (s === 0) {
        dst[0] = dst[1] = dst[2] = (v * 255) + 0.5;
        return dst;
    }

    // keep hue in [0,1) so the `switch(i)` below only needs 6 cases (0-5)
    h %= 1;
    const i = (h * 6) | 0;
    const f = (h * 6) - i;
    const p = v * (1 - s);
    const q = v * (1 - (s * f));
    const t = v * (1 - (s * (1 - f)));

    let r = 0;
    let g = 0;
    let b = 0;

    switch (i) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
    }

    // Add 0.5 in order to round. Setting integer TypedArray elements implicitly floors.
    dst[0] = (r * 255) + 0.5;
    dst[1] = (g * 255) + 0.5;
    dst[2] = (b * 255) + 0.5;
    return dst;
};

class EffectTransform {

    /**
     * Transform a color in-place given the drawable's effect uniforms.  Will apply
     * Ghost and Color and Brightness effects.
     * @param {Drawable} drawable The drawable to get uniforms from.
     * @param {Uint8ClampedArray} inOutColor The color to transform.
     * @param {number} [effectMask] A bitmask for which effects to use. Optional.
     * @returns {Uint8ClampedArray} dst filled with the transformed color
     */
    static transformColor (drawable, inOutColor, effectMask) {
        // If the color is fully transparent, don't bother attempting any transformations.
        if (inOutColor[3] === 0) {
            return inOutColor;
        }

        let effects = drawable.enabledEffects;
        if (typeof effectMask === 'number') effects &= effectMask;
        const uniforms = drawable.getUniforms();

        const enableColor = (effects & ShaderManager.EFFECT_INFO.color.mask) !== 0;
        const enableBrightness = (effects & ShaderManager.EFFECT_INFO.brightness.mask) !== 0;

        if (enableColor || enableBrightness) {
            // gl_FragColor.rgb /= gl_FragColor.a + epsilon;
            // Here, we're dividing by the (previously pre-multiplied) alpha to ensure HSV is properly calculated
            // for partially transparent pixels.
            // epsilon is present in the shader because dividing by 0 (fully transparent pixels) messes up calculations.
            // We're doing this with a Uint8ClampedArray here, so dividing by 0 just gives 255. We're later multiplying
            // by 0 again, so it won't affect results.
            const alpha = inOutColor[3] / 255;
            inOutColor[0] /= alpha;
            inOutColor[1] /= alpha;
            inOutColor[2] /= alpha;

            if (enableColor) {
                // vec3 hsv = convertRGB2HSV(gl_FragColor.xyz);
                const hsv = rgbToHsv(inOutColor, __hsv);

                // this code forces grayscale values to be slightly saturated
                // so that some slight change of hue will be visible
                // const float minLightness = 0.11 / 2.0;
                const minV = 0.11 / 2.0;
                // const float minSaturation = 0.09;
                const minS = 0.09;
                // if (hsv.z < minLightness) hsv = vec3(0.0, 1.0, minLightness);
                if (hsv[2] < minV) {
                    hsv[0] = 0;
                    hsv[1] = 1;
                    hsv[2] = minV;
                // else if (hsv.y < minSaturation) hsv = vec3(0.0, minSaturation, hsv.z);
                } else if (hsv[1] < minS) {
                    hsv[0] = 0;
                    hsv[1] = minS;
                }

                // hsv.x = mod(hsv.x + u_color, 1.0);
                // if (hsv.x < 0.0) hsv.x += 1.0;
                hsv[0] = (uniforms.u_color + hsv[0] + 1);

                // gl_FragColor.rgb = convertHSV2RGB(hsl);
                hsvToRgb(hsv, inOutColor);
            }

            if (enableBrightness) {
                const brightness = uniforms.u_brightness * 255;
                // gl_FragColor.rgb = clamp(gl_FragColor.rgb + vec3(u_brightness), vec3(0), vec3(1));
                // We don't need to clamp because the Uint8ClampedArray does that for us
                inOutColor[0] += brightness;
                inOutColor[1] += brightness;
                inOutColor[2] += brightness;
            }

            // gl_FragColor.rgb *= gl_FragColor.a + epsilon;
            // Now we're doing the reverse, premultiplying by the alpha once again.
            inOutColor[0] *= alpha;
            inOutColor[1] *= alpha;
            inOutColor[2] *= alpha;
        }

        if ((effects & ShaderManager.EFFECT_INFO.ghost.mask) !== 0) {
            // gl_FragColor *= u_ghost
            inOutColor[0] *= uniforms.u_ghost;
            inOutColor[1] *= uniforms.u_ghost;
            inOutColor[2] *= uniforms.u_ghost;
            inOutColor[3] *= uniforms.u_ghost;
        }

        return inOutColor;
    }

    /**
     * Transform a texture coordinate to one that would be select after applying shader effects.
     * @param {Drawable} drawable The drawable whose effects to emulate.
     * @param {twgl.v3} vec The texture coordinate to transform.
     * @param {twgl.v3} dst A place to store the output coordinate.
     * @return {twgl.v3} dst - The coordinate after being transform by effects.
     */
    static transformPoint (drawable, vec, dst) {
        twgl.v3.copy(vec, dst);

        const effects = drawable.enabledEffects;
        const uniforms = drawable.getUniforms();
        if ((effects & ShaderManager.EFFECT_INFO.mosaic.mask) !== 0) {
            // texcoord0 = fract(u_mosaic * texcoord0);
            dst[0] = uniforms.u_mosaic * dst[0] % 1;
            dst[1] = uniforms.u_mosaic * dst[1] % 1;
        }
        if ((effects & ShaderManager.EFFECT_INFO.pixelate.mask) !== 0) {
            const skinUniforms = drawable.skin.getUniforms();
            // vec2 pixelTexelSize = u_skinSize / u_pixelate;
            const texelX = skinUniforms.u_skinSize[0] / uniforms.u_pixelate;
            const texelY = skinUniforms.u_skinSize[1] / uniforms.u_pixelate;
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
            const offsetMagnitude = Math.sqrt(Math.pow(offsetX, 2) + Math.pow(offsetY, 2));
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
            const rot1 = cosWhirl;
            const rot2 = -sinWhirl;
            const rot3 = sinWhirl;
            const rot4 = cosWhirl;

            // texcoord0 = rotationMatrix * offset + kCenter;
            dst[0] = (rot1 * offsetX) + (rot3 * offsetY) + CENTER_X;
            dst[1] = (rot2 * offsetX) + (rot4 * offsetY) + CENTER_Y;
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
