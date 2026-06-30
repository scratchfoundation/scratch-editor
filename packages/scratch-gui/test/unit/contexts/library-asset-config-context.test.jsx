import React from 'react';
import {render, screen} from '@testing-library/react';

import {
    LibraryAssetConfigContext,
    LibraryAssetConfigProvider
} from '../../../src/contexts/library-asset-config-context.jsx';
import {DEFAULT_LIBRARY_ASSET_URL_TEMPLATE} from '../../../src/lib/library-asset-url';

const ConfigConsumer = () => (
    <LibraryAssetConfigContext.Consumer>
        {({libraryAssetUrlTemplate}) => (
            <span data-testid="template">{libraryAssetUrlTemplate}</span>
        )}
    </LibraryAssetConfigContext.Consumer>
);

describe('LibraryAssetConfigContext', () => {
    test('consumer uses default config without a provider', () => {
        render(<ConfigConsumer />);
        expect(screen.getByTestId('template').textContent).toBe(
            DEFAULT_LIBRARY_ASSET_URL_TEMPLATE
        );
    });

    test('provider supplies custom URL template', () => {
        render(
            <LibraryAssetConfigProvider
                libraryAssetUrlTemplate="https://cdn.example.com/assets/{assetPath}"
            >
                <ConfigConsumer />
            </LibraryAssetConfigProvider>
        );
        expect(screen.getByTestId('template').textContent).toBe(
            'https://cdn.example.com/assets/{assetPath}'
        );
    });

    test('provider defaults to MIT template when prop is unset', () => {
        render(
            <LibraryAssetConfigProvider>
                <ConfigConsumer />
            </LibraryAssetConfigProvider>
        );
        expect(screen.getByTestId('template').textContent).toBe(
            DEFAULT_LIBRARY_ASSET_URL_TEMPLATE
        );
    });

    test('provider value reference is stable when props are unchanged', () => {
        const seen = [];
        const captureContextValue = function (value) {
            seen.push(value);
            return null;
        };
        const Capture = () => (
            <LibraryAssetConfigContext.Consumer>
                {captureContextValue}
            </LibraryAssetConfigContext.Consumer>
        );
        const {rerender} = render(
            <LibraryAssetConfigProvider
                libraryAssetUrlTemplate="https://api.example.com/{assetPath}"
            >
                <Capture />
            </LibraryAssetConfigProvider>
        );
        const first = seen[0];
        rerender(
            <LibraryAssetConfigProvider
                libraryAssetUrlTemplate="https://api.example.com/{assetPath}"
            >
                <Capture />
            </LibraryAssetConfigProvider>
        );
        expect(seen[1]).toBe(first);
    });
});
