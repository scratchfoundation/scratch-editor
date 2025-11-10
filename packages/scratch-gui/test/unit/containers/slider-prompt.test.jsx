import React from 'react';
import SliderPrompt from '../../../src/containers/slider-prompt.jsx';
import {screen, fireEvent} from '@testing-library/react';
import {renderWithIntl} from '../../helpers/intl-helpers.jsx';
import {Provider} from 'react-redux';
import configureStore from 'redux-mock-store';


describe('Slider Prompt Container', () => {

    const store = configureStore()({
        locales: {
            isRtl: false,
            locale: 'en-US'
        }
    });


    let onCancel;
    let onOk;

    beforeEach(() => {
        onCancel = jest.fn();
        onOk = jest.fn();
    });

    test('matches snapshot', () => {
        renderWithIntl(
            <Provider store={store}>
                <SliderPrompt
                    isDiscrete={false}
                    maxValue={100}
                    minValue={0}
                    onCancel={onCancel}
                    onOk={onOk}
                />
            </Provider>
        );
        expect(document.body).toMatchSnapshot();
    });

    test('calls onOk when confirm button is clicked', () => {
        renderWithIntl(
            <Provider store={store}>
                <SliderPrompt
                    isDiscrete={false}
                    maxValue={100}
                    minValue={0}
                    onCancel={onCancel}
                    onOk={onOk}
                />
            </Provider>
        );

        fireEvent.click(screen.getByRole('button', {name: 'OK'}));
        expect(onOk).toHaveBeenCalled();
    });

    test('calls onCancel when cancel button is clicked', () => {
        renderWithIntl(
            <Provider store={store}>
                <SliderPrompt
                    isDiscrete={false}
                    maxValue={100}
                    minValue={0}
                    onCancel={onCancel}
                    onOk={onOk}
                />
            </Provider>
        );

        fireEvent.click(screen.getByRole('button', {name: 'Cancel'}));
        expect(onCancel).toHaveBeenCalled();
    });
});
