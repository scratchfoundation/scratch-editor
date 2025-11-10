import React from 'react';
import {renderWithIntl} from '../../helpers/intl-helpers.jsx';
import SpriteSelectorItemComponent from '../../../src/components/sprite-selector-item/sprite-selector-item';
import {fireEvent, waitFor} from '@testing-library/react';

// Neccessary for RadixUI Context Menu
global.MutationObserver = class {
    disconnect () { }
    observe () { }
};
document.body.insertAdjacentElement = jest.fn();
global.DOMRect = {
    fromRect: ({x = 0, y = 0, width = 0, height = 0} = {}) =>
        ({x, y, width, height, top: y, left: x, right: x + width, bottom: y + height})
};


describe('SpriteSelectorItemComponent', () => {
    let className;
    let costumeURL;
    let name;
    let onClick;
    let onDeleteButtonClick;
    let selected;
    let number;
    let details;

    // Wrap this in a function so it gets test specific states and can be reused.
    const getComponent = function () {
        return (
            <SpriteSelectorItemComponent
                className={className}
                costumeURL={costumeURL}
                details={details}
                name={name}
                number={number}
                selected={selected}
                onClick={onClick}
                onDeleteButtonClick={onDeleteButtonClick}
            />
        );
    };

    beforeEach(() => {
        className = 'ponies';
        costumeURL = 'https://scratch.mit.edu/foo/bar/pony';
        name = 'Pony sprite';
        onClick = jest.fn();
        onDeleteButtonClick = jest.fn();
        selected = true;
        // Reset to undefined since they are optional props
        number = undefined; // eslint-disable-line no-undefined
        details = undefined; // eslint-disable-line no-undefined
    });

    test('matches snapshot when selected', () => {
        const {container} = renderWithIntl(getComponent());
        expect(container.firstChild).toMatchSnapshot();
    });

    test('matches snapshot when given a number and details to show', () => {
        number = 5;
        details = '480 x 360';
        const {container} = renderWithIntl(getComponent());
        expect(container.firstChild).toMatchSnapshot();
    });

    test('does not have a close box when not selected', () => {
        selected = false;
        const {container} = renderWithIntl(getComponent());
        expect(container.firstChild).toMatchSnapshot();
    });

    test('triggers callback when Box component is clicked', () => {
        const {container} = renderWithIntl(getComponent());
        fireEvent.click(container.firstChild);
        expect(onClick).toHaveBeenCalled();
    });

    test('triggers callback when CloseButton component is clicked', () => {
        const {container} = renderWithIntl(getComponent());
        const deleteButton = container.querySelector('div[role="button"][aria-label="Delete"]');
        fireEvent.click(deleteButton);
        expect(onDeleteButtonClick).toHaveBeenCalled();
    });

    test('it has a context menu with delete menu item and callback', async () => {
        const {container} = renderWithIntl(getComponent());
        fireEvent.contextMenu(container.firstChild);

        await waitFor(() => {
            const menu = document.querySelector('[data-state="open"]');
            expect(menu).toBeTruthy();
        });

        const deleteMenuItem = document.querySelector('[role="menuitem"]');
        expect(deleteMenuItem.textContent).toBe('delete');
        fireEvent.click(deleteMenuItem);
        expect(onDeleteButtonClick).toHaveBeenCalled();
    });
});
