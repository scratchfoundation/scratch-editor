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

// color conversions grabbed from https://gist.github.com/mjackson/5311256

/**
 * Converts an RGB color value to HSL. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and l in the set [0, 1].
 *
 * @param   {number}  r       The red color value
 * @param   {number}  g       The green color value
 * @param   {number}  b       The blue color value
 * @return  {Array}           The HSL representation
 */
const rgbToHsl = ([r, g, b]) => {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h;
    let s;
    const l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
        case r: h = ((g - b) / d) + (g < b ? 6 : 0); break;
        case g: h = ((b - r) / d) + 2; break;
        case b: h = ((r - g) / d) + 4; break;
        }

        h /= 6;
    }

    return [h, s, l];
};

/**
 * Helper function for hslToRgb is called with varying 't' values to get
 * red green and blue values from the p/q/t color space calculations
 * @param {number} p vector coordinates
 * @param {number} q vector coordinates
 * @param {number} t vector coordinates
 * @return {number} amount of r/g/b byte
 */
const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + ((q - p) * 6 * t);
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + ((q - p) * ((2 / 3) - t) * 6);
    return p;
};


/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   {number}  h       The hue
 * @param   {number}  s       The saturation
 * @param   {number}  l       The lightness
 * @return  {Array}           The RGB representation
 */
const hslToRgb = ([h, s, l]) => {
    let r;
    let g;
    let b;

    if (s === 0) {
        r = g = b = l; // achromatic
    } else {

        const q = l < 0.5 ? l * (1 + s) : l + s - (l * s);
        const p = (2 * l) - q;

        r = hue2rgb(p, q, h + (1 / 3));
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - (1 / 3));
    }

    return [r * 255, g * 255, b * 255];
};

class EffectTransform {

    /**
     * Transform a color in-place given the drawable's effect uniforms.  Will apply
     * Ghost and Color and Brightness effects.
     * @param {Drawable} drawable The drawable to get uniforms from.
     * @param {Uint8ClampedArray} inOutColor The color to transform.
     * @returns {Uint8ClampedArray} dst filled with the transformed color
     */
    static transformColor (drawable, inOutColor) {

        // If the color is fully transparent, don't bother attempting any transformations.
        if (inOutColor[3] === 0) {
            return inOutColor;
        }

        const effects = drawable.enabledEffects;
        const uniforms = drawable.getUniforms();

        if ((effects & ShaderManager.EFFECT_INFO.ghost.mask) !== 0) {
            // gl_FragColor.a *= u_ghost
            inOutColor[3] *= uniforms.u_ghost;
        }

        const enableColor = (effects & ShaderManager.EFFECT_INFO.color.mask) !== 0;
        const enableBrightness = (effects & ShaderManager.EFFECT_INFO.brightness.mask) !== 0;

        if (enableColor || enableBrightness) {
            // vec3 hsl = convertRGB2HSL(gl_FragColor.xyz);
            const hsl = rgbToHsl(inOutColor);

            if (enableColor) {
                // this code forces grayscale values to be slightly saturated
                // so that some slight change of hue will be visible
                // const float minLightness = 0.11 / 2.0;
                const minL = 0.11 / 2.0;
                // const float minSaturation = 0.09;
                const minS = 0.09;
                // if (hsl.z < minLightness) hsl = vec3(0.0, 1.0, minLightness);
                if (hsl[2] < minL) {
                    hsl[0] = 0;
                    hsl[1] = 1;
                    hsl[2] = minL;
                // else if (hsl.y < minSaturation) hsl = vec3(0.0, minSaturation, hsl.z);
                } else if (hsl[1] < minS) {
                    hsl[0] = 0;
                    hsl[1] = minS;
                }

                // hsl.x = mod(hsl.x + u_color, 1.0);
                // if (hsl.x < 0.0) hsl.x += 1.0;
                hsl[0] = (uniforms.u_color + hsl[0] + 1) % 1;
            }

            if (enableBrightness) {
                // hsl.z = clamp(hsl.z + u_brightness, 0.0, 1.0);
                hsl[2] = Math.min(1, hsl[2] + uniforms.u_brightness);
            }
            // gl_FragColor.rgb = convertHSL2RGB(hsl);
            inOutColor.set(hslToRgb(hsl));
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
