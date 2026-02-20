import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import {render, screen, fireEvent} from '@testing-library/react';
import ActionMenu from '../../../src/components/action-menu/action-menu.jsx';
import {KEY} from '../../../src/lib/navigation-keys';
import React, {act} from 'react';

/**
 * Wrap a callback in act and wait for a given time (ms) afterwards.
 * @param {() => void} callback - the function that triggers state updates
 * @param {number} waitTime - milliseconds to wait after act
 */
export const actWithDelay = async (callback, waitTime = 200) => {
    await act(async () => {
        callback();
        jest.advanceTimersByTime(waitTime);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    });
};

describe('ActionMenu keyboard navigation', () => {
    const mockOnClick = jest.fn();
    const mockMoreButtonClick = jest.fn();

    const defaultProps = {
        title: 'Main Button',
        img: 'main-icon.svg',
        onClick: mockOnClick,
        moreButtons: [
            {title: 'Button 1', img: 'icon1.svg', onClick: mockMoreButtonClick},
            {title: 'Button 2', img: 'icon2.svg', onClick: mockMoreButtonClick},
            {title: 'Button 3', img: 'icon3.svg', onClick: mockMoreButtonClick}
        ]
    };

    beforeEach(() => {
        jest.useFakeTimers();
        mockOnClick.mockClear();
        mockMoreButtonClick.mockClear();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    test('focus + arrow_down opens menu and arrow_up cycles to last', () => {
        render(<ActionMenu {...defaultProps} />);
        
        const mainButton = screen.getByRole('button', {name: 'Main Button'});
        act(() => {
            mainButton.focus();
        });

        act(() => {
            fireEvent.keyDown(mainButton, {key: KEY.ARROW_DOWN});
        });
        const firstItem = screen.getByRole('button', {name: 'Button 1'});
        expect(document.activeElement).toBe(firstItem);

        act(() => {
            fireEvent.keyDown(firstItem, {key: KEY.ARROW_UP});
        });
        const lastItem = screen.getByRole('button', {name: 'Button 3'});
        expect(document.activeElement).toBe(lastItem);
    });

    test('escape closes menu and returns focus to main button', () => {
        render(<ActionMenu {...defaultProps} />);
        
        const mainButton = screen.getByRole('button', {name: 'Main Button'});
        act(() => {
            mainButton.focus();
            fireEvent.keyDown(mainButton, {key: KEY.ARROW_DOWN});
        });
        
        const firstItem = screen.getByRole('button', {name: 'Button 1'});
        expect(document.activeElement).toBe(firstItem);

        act(() => {
            fireEvent.keyDown(firstItem, {key: KEY.ESCAPE});
        });
        expect(document.activeElement).toBe(mainButton);
    });

    test('tab closes menu and focuses next element', async () => {
        jest.useRealTimers();

        render(
            <>
                <ActionMenu {...defaultProps} />
                <button>After Menu</button>
            </>
        );

        const mainButton = screen.getByRole('button', {name: 'Main Button'});
        const afterButton = screen.getByRole('button', {name: 'After Menu'});
        const user = userEvent.setup();

        act(() => {
            mainButton.focus();
            fireEvent.keyDown(mainButton, {key: KEY.ARROW_DOWN});
        });

        const firstItem = screen.getByRole('button', {name: 'Button 1'});
        expect(document.activeElement).toBe(firstItem);

        await act(async () => {
            await user.tab();
        });

        // Wait 1 second for any menu close animations or timeouts
        await new Promise(resolve => setTimeout(resolve, 1000));
        expect(document.activeElement).toBe(afterButton);

        jest.useFakeTimers();
    });
});
