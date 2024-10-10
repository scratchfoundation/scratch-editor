import { DataFormat } from './DataFormat';

export interface AssetType {
    contentType: string,
    name: string,
    runtimeFormat: DataFormat,
    immutable: boolean
}

/**
 * Enumeration of the supported asset types.
 * @type {Object.<String,AssetType>}
 * @typedef {Object} AssetType - Information about a supported asset type.
 * @property {string} contentType - the MIME type associated with this kind of data. Useful for data URIs, etc.
 * @property {string} name - The human-readable name of this asset type.
 * @property {DataFormat} runtimeFormat - The default format used for runtime, in-memory storage of this asset. For
 *     example, a project stored in SB2 format on disk will be returned as JSON when loaded into memory.
 * @property {boolean} immutable - Indicates if the asset id is determined by the asset content.
 */
export const AssetType = {
    ImageBitmap: {
        contentType: 'image/png',
        name: 'ImageBitmap',
        runtimeFormat: DataFormat.PNG,
        immutable: true
    },
    ImageVector: {
        contentType: 'image/svg+xml',
        name: 'ImageVector',
        runtimeFormat: DataFormat.SVG,
        immutable: true
    },
    Project: {
        contentType: 'application/json',
        name: 'Project',
        runtimeFormat: DataFormat.JSON,
        immutable: false
    },
    Sound: {
        contentType: 'audio/x-wav',
        name: 'Sound',
        runtimeFormat: DataFormat.WAV,
        immutable: true
    },
    Sprite: {
        contentType: 'application/json',
        name: 'Sprite',
        runtimeFormat: DataFormat.JSON,
        immutable: true
    }
} as const;
