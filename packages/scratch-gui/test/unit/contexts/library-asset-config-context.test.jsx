import React from 'react';
import {render, screen} from '@testing-library/react';

import {
    LibraryAssetConfigProvider,
    useLibraryAssetConfig
} from '../../../src/contexts/library-asset-config-context.jsx';
import {DEFAULT_LIBRARY_ASSET_HOST} from '../../../src/lib/library-asset-url';

const ConfigConsumer = () => {
    const {libraryAssetHost, libraryAssetsFetchWithHeaders} = useLibraryAssetConfig();
    return (
        <div>
            <span data-testid="host">{libraryAssetHost}</span>
            <span data-testid="headers">{String(libraryAssetsFetchWithHeaders)}</span>
        </div>
    );
};

describe('LibraryAssetConfigContext', () => {
    test('consumer uses default config without a provider', () => {
        render(<ConfigConsumer />);
        expect(screen.getByTestId('host').textContent).toBe(DEFAULT_LIBRARY_ASSET_HOST);
        expect(screen.getByTestId('headers').textContent).toBe('false');
    });

    test('provider supplies custom host and headers flag', () => {
        render(
            <LibraryAssetConfigProvider
                libraryAssetHost="http://localhost:3009/api/scratch/assets"
                libraryAssetsFetchWithHeaders
            >
                <ConfigConsumer />
            </LibraryAssetConfigProvider>
        );
        expect(screen.getByTestId('host').textContent).toBe(
            'http://localhost:3009/api/scratch/assets'
        );
        expect(screen.getByTestId('headers').textContent).toBe('true');
    });

    test('provider value reference is stable when props are unchanged', () => {
        const seen = [];
        const Capture = () => {
            seen.push(useLibraryAssetConfig());
            return null;
        };
        const {rerender} = render(
            <LibraryAssetConfigProvider
                libraryAssetHost="https://api.example.com/assets"
                libraryAssetsFetchWithHeaders
            >
                <Capture />
            </LibraryAssetConfigProvider>
        );
        const first = seen[0];
        rerender(
            <LibraryAssetConfigProvider
                libraryAssetHost="https://api.example.com/assets"
                libraryAssetsFetchWithHeaders
            >
                <Capture />
            </LibraryAssetConfigProvider>
        );
        expect(seen[1]).toBe(first);
    });
});
