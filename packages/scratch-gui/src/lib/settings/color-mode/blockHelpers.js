import {DEFAULT_MODE, getColorsForMode, colorModeMap} from '.';

const getBlockIconURI = extensionIcons => {
    if (!extensionIcons) return null;

    return extensionIcons.blockIconURI || extensionIcons.menuIconURI;
};

const getCategoryIconURI = extensionIcons => {
    if (!extensionIcons) return null;

    return extensionIcons.menuIconURI || extensionIcons.blockIconURI;
};

// scratch-blocks colours has a pen property that scratch-gui uses for all extensions
const getExtensionColors = mode => getColorsForMode(mode).pen;

/**
 * Applies extension color mode to categories.
 * No changes are applied if called with the default color mode, allowing extensions to provide their own colors.
 * These colors are not seen if the category provides a blockIconURI.
 * @param {Array.<object>} dynamicBlockXML - XML for each category of extension blocks, returned from getBlocksXML
 * in the vm runtime.
 * @param {string} mode - Color Mode name
 * @returns {Array.<object>} Dynamic block XML updated with colors.
 */
const injectExtensionCategoryMode = (dynamicBlockXML, mode) => {
    // Don't do any manipulation for the default mode
    if (mode === DEFAULT_MODE) return dynamicBlockXML;

    const extensionColors = getExtensionColors(mode);
    const extensionIcons = colorModeMap[mode].extensions;
    const parser = new DOMParser();
    const serializer = new XMLSerializer();

    return dynamicBlockXML.map(extension => {
        const dom = parser.parseFromString(extension.xml, 'text/xml');

        dom.documentElement.setAttribute('colour', extensionColors.primary);
        // Note: the category's secondaryColour matches up with the blocks' tertiary color, both used for border color.
        dom.documentElement.setAttribute('secondaryColour', extensionColors.tertiary);

        const categoryIconURI = getCategoryIconURI(extensionIcons[extension.id]);
        if (categoryIconURI) {
            dom.documentElement.setAttribute('iconURI', categoryIconURI);
        }

        return {
            ...extension,
            xml: serializer.serializeToString(dom)
        };
    });
};

const injectBlockIcons = (blockInfoJson, mode) => {
    // Block icons are the first element of `args0`
    if (!blockInfoJson.args0 || blockInfoJson.args0.length < 1 ||
        blockInfoJson.args0[0].type !== 'field_image') return blockInfoJson;

    const extensionIcons = colorModeMap[mode].extensions;
    const extensionId = blockInfoJson.type.substring(0, blockInfoJson.type.indexOf('_'));
    const blockIconURI = getBlockIconURI(extensionIcons[extensionId]);

    if (!blockIconURI) return blockInfoJson;

    return {
        ...blockInfoJson,
        args0: blockInfoJson.args0.map((value, index) => {
            if (index !== 0) return value;

            return {
                ...value,
                src: blockIconURI
            };
        })
    };
};

/**
 * Applies extension color mode to static block json.
 * No changes are applied if called with the default mode, allowing extensions to provide their own colors.
 * @param {object} blockInfoJson - Static block json
 * @param {string} mode - Color Mode name
 * @returns {object} Block info json with updated colors. The original blockInfoJson is not modified.
 */
const injectExtensionBlockMode = (blockInfoJson, mode) => {
    // Don't do any manipulation for the default mode
    if (mode === DEFAULT_MODE) return blockInfoJson;

    const extensionColors = getExtensionColors(mode);

    return {
        ...injectBlockIcons(blockInfoJson, mode),
        colour: extensionColors.primary,
        colourSecondary: extensionColors.secondary,
        colourTertiary: extensionColors.tertiary,
        colourQuaternary: extensionColors.quaternary
    };
};

export {
    injectExtensionBlockMode,
    injectExtensionCategoryMode
};
