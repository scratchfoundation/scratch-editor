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
 * @param   {Array<number>} dst   The array to store the HSV values in
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

module.exports = {rgbToHsv, hsvToRgb};
