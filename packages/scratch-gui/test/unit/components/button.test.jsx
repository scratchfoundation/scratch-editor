import React from 'react';
import {render, fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import ButtonComponent from '../../../src/components/button/button';

describe('ButtonComponent', () => {
    test('matches snapshot', () => {
        const {container} = render(
            <ButtonComponent onClick={jest.fn()} />
        );

        expect(container.firstChild).toMatchSnapshot();
    });

    test('triggers callback when clicked', () => {
        const onClick = jest.fn();
        const {container} = render(
            <ButtonComponent onClick={onClick} />
        );

        const button = container.firstChild;

        fireEvent.click(button);

        expect(onClick).toHaveBeenCalledTimes(1);
    });

    test('does not trigger callback when not clicked', () => {
        const onClick = jest.fn();
        render(
            <ButtonComponent onClick={onClick} />
        );
        
        expect(onClick).toHaveBeenCalledTimes(0);
    });
});
