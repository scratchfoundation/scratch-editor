import React from 'react';
import {Provider} from 'react-redux';
import '@testing-library/jest-dom';
import configureStore from 'redux-mock-store';
import ErrorBoundary from '../../../src/containers/error-boundary.jsx';
import {renderWithIntl} from '../../helpers/intl-helpers.jsx';

const ChildComponent = () => <div>hello</div>;

describe('ErrorBoundary', () => {
    const mockStore = configureStore();
    let store;

    beforeEach(() => {
        store = mockStore({
            locales: {
                isRtl: false,
                locale: 'en-US'
            }
        });
    });

    test('ErrorBoundary shows children before error and CrashMessageComponent after', () => {
        const child = <ChildComponent />;
        const {container} = renderWithIntl(
            <Provider store={store}>
                <ErrorBoundary action="test">{child}</ErrorBoundary>
            </Provider>
        );

        const helloTextNoError = [...container.querySelectorAll('div')].reverse().find(el => el.textContent.includes('hello'));
        expect(helloTextNoError).toBeTruthy();
        expect(container.querySelector('h2')).toBeFalsy();

        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        const ThrowError = () => {
            throw new Error('Test error');
        };
        const {container: containerError} = renderWithIntl(
            <Provider store={store}>
                <ErrorBoundary action="test"> <ThrowError /></ErrorBoundary>
            </Provider>
        );
        consoleLogSpy.mockRestore();

        const helloTextError = [...containerError.querySelectorAll('div')].reverse().find(el => el.textContent.includes('hello'));
        expect(helloTextError).toBeFalsy();
        expect(containerError.querySelector('h2')).toHaveTextContent('Oops! Something went wrong.');
    });
});
