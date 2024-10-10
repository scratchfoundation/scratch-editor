/**
 * Enumeration of the supported data formats.
 * @enum {string}
 */
export const DataFormat = {
    JPG: 'jpg',
    JSON: 'json',
    MP3: 'mp3',
    PNG: 'png',
    SB2: 'sb2',
    SB3: 'sb3',
    SVG: 'svg',
    WAV: 'wav'
} as const;

export type DataFormat = typeof DataFormat[keyof typeof DataFormat];
