import React from 'react';
import {Provider} from 'react-redux';
import configureStore from 'redux-mock-store';
import {renderWithIntl} from '../../helpers/intl-helpers.jsx';
import SaveStatus from '../../../src/components/menu-bar/save-status.jsx';
import {fireEvent, screen} from '@testing-library/react';
import {AlertTypes} from '../../../src/lib/alerts/index.jsx';


global.MutationObserver = class {
    disconnect () { }
    observe () { }
};

// Stub the manualUpdateProject action creator for later testing
jest.mock('../../../src/reducers/project-state', () => ({
    manualUpdateProject: jest.fn(() => ({type: 'stubbed'}))
}));

describe('SaveStatus container', () => {
    const mockStore = configureStore();

    test('if there are inline messages, they are shown instead of save now', () => {
        const store = mockStore({
            scratchGui: {
                projectChanged: true,
                alerts: {
                    alertsList: [
                        {alertId: 'saveSuccess', alertType: AlertTypes.INLINE}
                    ]
                }
            }
        });
        const {container} = renderWithIntl(
            <Provider store={store}>
                <SaveStatus />
            </Provider>
        );

        const inlineMessage = container.querySelector('[aria-label="inline message"]');
        expect(inlineMessage).toBeTruthy();
        const saveNow = screen.queryByText('Save Now');
        expect(saveNow).toBeNull();
    });

    test('save now is shown if there are project changes and no inline messages', () => {
        const store = mockStore({
            scratchGui: {
                projectChanged: true,
                alerts: {
                    alertsList: []
                }
            }
        });
        const {container} = renderWithIntl(
            <Provider store={store}>
                <SaveStatus />
            </Provider>
        );

        const saveNow = screen.getByText('Save Now');
        const inlineMessage = container.querySelector('[aria-label="inline message"]');
        expect(inlineMessage).toBeFalsy();

        // Clicking save now should dispatch the manualUpdateProject action (stubbed above)
        fireEvent.click(saveNow);
        expect(store.getActions()[0].type).toEqual('stubbed');
    });

    test('neither is shown if there are no project changes or inline messages', () => {
        const store = mockStore({
            scratchGui: {
                projectChanged: false,
                alerts: {
                    alertsList: []
                }
            }
        });

        const {container} = renderWithIntl(
            <Provider store={store}>
                <SaveStatus />
            </Provider>
        );

        const inlineMessage = container.querySelector('[aria-label="inline message"]');
        expect(inlineMessage).toBeFalsy();
        const saveNow = screen.queryByText('Save Now');
        expect(saveNow).toBeNull();
    });
});
