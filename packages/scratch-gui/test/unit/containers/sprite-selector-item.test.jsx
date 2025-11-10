import React from 'react';
import {renderWithIntl} from '../../helpers/intl-helpers.jsx';
import configureStore from 'redux-mock-store';
import {Provider} from 'react-redux';
import VM from '@scratch/scratch-vm';

import SpriteSelectorItemContainer from '../../../src/containers/sprite-selector-item';
import {legacyConfig} from '../../../src/legacy-config';
import DeleteConfirmationPrompt from '../../../src/containers/delete-confirmation-prompt';
import {screen, fireEvent, waitFor} from '@testing-library/react';

global.MutationObserver = class {
    disconnect () { }
    observe () { }
};

jest.mock('../../../src/containers/delete-confirmation-prompt', () => jest.fn(() => null));
describe('SpriteSelectorItem Container', () => {
    const mockStore = configureStore();
    let className;
    let costumeURL;
    let name;
    let onClick;
    let dispatchSetHoveredSprite;
    let onDeleteButtonClick;
    let selected;
    let id;
    let store;
    let vm;
    // Wrap this in a function so it gets test specific states and can be reused.
    const getContainer = function (withDeleteConfirmation) {
        return (
            <Provider store={store}>
                <SpriteSelectorItemContainer
                    className={className}
                    costumeURL={costumeURL}
                    dispatchSetHoveredSprite={dispatchSetHoveredSprite}
                    id={id}
                    name={name}
                    selected={selected}
                    onClick={onClick}
                    onDeleteButtonClick={onDeleteButtonClick}
                    vm={vm}
                    withDeleteConfirmation={withDeleteConfirmation}
                />
            </Provider>
        );
    };

    beforeEach(() => {
        className = 'ponies';
        costumeURL = 'https://scratch.mit.edu/foo/bar/pony';
        id = 1337;
        name = 'Pony sprite';
        onClick = jest.fn();
        onDeleteButtonClick = jest.fn();
        dispatchSetHoveredSprite = jest.fn();
        selected = true;
        vm = new VM();
        store = mockStore({
            scratchGui: {
                config: legacyConfig,
                hoveredTarget: {receivedBlocks: false, sprite: null},
                assetDrag: {dragging: false},
                vm
            },
            locales: {
                isRtl: false
            }
        });
    });

    test('should delete the sprite, when called without `withDeleteConfirmation`', () => {
        onDeleteButtonClick = jest.fn();

        renderWithIntl(getContainer());

        const deleteButton = screen.getByRole('button', {name: /delete/i});
        fireEvent.click(deleteButton);
        expect(onDeleteButtonClick).toHaveBeenCalledWith(1337);
        expect(DeleteConfirmationPrompt).not.toHaveBeenCalled();

    });

    test('should initiate sprite deletion, when called `withDeleteConfirmation`', async () => {
        onDeleteButtonClick = jest.fn();

        renderWithIntl(getContainer(true));

        expect(DeleteConfirmationPrompt).not.toHaveBeenCalled();
        const deleteButton = screen.getByRole('button', {name: /delete/i});
        fireEvent.click(deleteButton);
        await waitFor(() => expect(DeleteConfirmationPrompt).toHaveBeenCalled());
    });
});
