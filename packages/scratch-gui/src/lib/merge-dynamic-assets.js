/**
 * Maps a dynamic asset object to a new object based on its visibility.
 * If the asset is public, returns it unchanged.
 * Otherwise, marks it as member-only and adds a 'membership' tag.
 * @param {object} item - The asset object to map.
 * @param {boolean} item.isPublic - Indicates if the asset is public.
 * @param {boolean} [item.isMemberOnly] - Indicates if the asset is member-only.
 * @param {string[]} [item.tags] - The tags associated with the asset.
 * @returns {object} The mapped asset object.
 */
const mapDynamicAsset = item => {
    if (item.isPublic) {
        return item;
    }

    return {
        ...item,
        isMemberOnly: true,
        tags: [...(item.tags || []), 'membership']
    };
};

/**
 * Merge static and dynamic assets, using name as key. If both a static and a dynamic
 * asset share the same name, the static asset is kept and the dynamic asset is skipped.
 * This intentionally gives precedence to static (bundled) assets so that dynamic assets
 * do not override them.
 * @param {Array} staticAssets the static assets bundled with the editor
 * @param {Array} dynamicAssets an array of dynamic assets loaded at runtime
 * @returns {Object} an object containing `source` and `data` properties, where:
 *  - `source` - the original dynamicAssets array (or null/undefined)
 *  - `data` - the merged array of assets
 */
const mergeDynamicAssets = (staticAssets, dynamicAssets) => {
    const effectiveDynamicAssets = dynamicAssets || [];

    let data = staticAssets;
    if (effectiveDynamicAssets.length > 0) {
        const map = new Map();
        staticAssets.forEach(item => map.set(item.name, item));
        effectiveDynamicAssets.forEach(item => {
            if (!map.has(item.name)) {
                map.set(item.name, mapDynamicAsset(item));
            }
        });
        data = Array.from(map.values());
        data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    const processedAssets = {};
    processedAssets.source = dynamicAssets;
    processedAssets.data = data;

    return processedAssets;
};

export default mergeDynamicAssets;
