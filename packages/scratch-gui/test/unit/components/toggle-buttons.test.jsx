import React from 'react';
import ToggleButtons from '../../../src/components/toggle-buttons/toggle-buttons';
import {fireEvent, render} from '@testing-library/react';


describe('ToggleButtons', () => {
    const buttons = [
        {
            title: 'Button 1',
            handleClick: jest.fn(),
            icon: 'Button 1 icon'
        },
        {
            title: 'Button 2',
            handleClick: jest.fn(),
            icon: 'Button 2 icon'
        }
    ];

    test('renders multiple buttons', () => {
        const {container} = render(<ToggleButtons
            buttons={buttons}
        />);

        expect(container.firstChild).toMatchSnapshot();
    });

    test('calls correct click handler', () => {
        const {container} = render(<ToggleButtons
            buttons={buttons}
        />);

        const button2 = container.querySelector('button[title="Button 2"]');
        fireEvent.click(button2);
        
        expect(buttons[1].handleClick).toHaveBeenCalled();
        expect(buttons[0].handleClick).not.toHaveBeenCalled();
    });
});
