import React from 'react';
import {render, fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import IconButton from '../../../src/components/icon-button/icon-button';

describe('IconButtonComponent', () => {
    const defaultProps = {
        img: 'imgSrc',
        title: <div>Text</div>,
        onClick: () => {},
        className: 'custom-class-name'
    };

    test('renders with all props correctly', () => {
        const {container} = render(<IconButton {...defaultProps} />);

        expect(container.firstChild).toMatchSnapshot();
    });

    test('triggers callback when clicked', () => {
        const onClick = jest.fn();

        const {container} = render(
            <IconButton
                {...defaultProps}
                onClick={onClick}
            />
        );

        const button = container.querySelector('div[role="button"]');

        fireEvent.click(button);

        expect(onClick).toHaveBeenCalledTimes(1);
    });

    test('does not trigger callback when not clicked', () => {
        const onClick = jest.fn();

        render(<IconButton
            {...defaultProps}
            onClick={onClick}
        />);
        
        expect(onClick).toHaveBeenCalledTimes(0);
    });
});
