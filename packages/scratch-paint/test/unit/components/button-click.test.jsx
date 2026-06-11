/* eslint-env jest */


import React from 'react';
import {render, fireEvent} from '@testing-library/react';
import Button from '../../../src/components/button/button.jsx';

describe('Button', () => {
    test('triggers callback when clicked', () => {
        const onClick = jest.fn();
        const {getByText} = render(
            <Button onClick={onClick}>
                {'Button'}
            </Button>
        );

        const buttonElement = getByText('Button');
        fireEvent.click(buttonElement);
        expect(onClick).toHaveBeenCalled();
    });
});
