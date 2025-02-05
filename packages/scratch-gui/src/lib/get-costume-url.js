import {inlineSvgFonts} from '@scratch/scratch-svg-renderer';

// Contains 'font-family', but doesn't only contain 'font-family="none"'
const HAS_FONT_REGEXP = 'font-family(?!="none")';

const getCostumeUrl = (function () {
    // The caching here assumes the scratchStorage instance doesn't change.
    // Which it shouldn't but it's good to keep that in mind anyway.
    let cachedAssetId;
    let cachedUrl;

    return function (scratchStorage, asset) {

        if (cachedAssetId === asset.assetId) {
            return cachedUrl;
        }

        cachedAssetId = asset.assetId;

        // If the SVG refers to fonts, they must be inlined in order to display correctly in the img tag.
        // Avoid parsing the SVG when possible, since it's expensive.
        if (asset.assetType === scratchStorage.AssetType.ImageVector) {
            const svgString = asset.decodeText();
            if (svgString.match(HAS_FONT_REGEXP)) {
                const svgText = inlineSvgFonts(svgString);
                cachedUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgText)}`;
            } else {
                cachedUrl = asset.encodeDataURI();
            }
        } else {
            cachedUrl = asset.encodeDataURI();
        }

        return cachedUrl;
    };
}());

export {
    getCostumeUrl as default,
    HAS_FONT_REGEXP
};
