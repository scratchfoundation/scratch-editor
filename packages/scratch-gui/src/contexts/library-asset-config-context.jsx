import React, {createContext, useMemo} from 'react';
import PropTypes from 'prop-types';

import {DEFAULT_LIBRARY_ASSET_URL_TEMPLATE} from '../lib/library-asset-url.js';

export const defaultLibraryAssetConfig = {
    libraryAssetUrlTemplate: DEFAULT_LIBRARY_ASSET_URL_TEMPLATE
};

export const LibraryAssetConfigContext = createContext(defaultLibraryAssetConfig);

/**
 * Supplies library asset URL template for all library modals.
 * Values are expected to be fixed for the editor session (set once by the embedder).
 * @param {object} props Component props.
 * @param {React.ReactNode} props.children Child components.
 * @param {string} [props.libraryAssetUrlTemplate] Full URL template with placeholders such as
 *   `{assetPath}`. When omitted, defaults to DEFAULT_LIBRARY_ASSET_URL_TEMPLATE
 *   (`https://cdn.assets.scratch.mit.edu/internalapi/asset/{assetPath}/get/`).
 * @returns {React.ReactElement} Context provider.
 */
export const LibraryAssetConfigProvider = ({
    children,
    libraryAssetUrlTemplate
}) => {
    const value = useMemo(
        () => ({
            libraryAssetUrlTemplate: libraryAssetUrlTemplate || DEFAULT_LIBRARY_ASSET_URL_TEMPLATE
        }),
        [libraryAssetUrlTemplate]
    );

    return (
        <LibraryAssetConfigContext.Provider value={value}>
            {children}
        </LibraryAssetConfigContext.Provider>
    );
};

LibraryAssetConfigProvider.propTypes = {
    children: PropTypes.node,
    libraryAssetUrlTemplate: PropTypes.string
};
