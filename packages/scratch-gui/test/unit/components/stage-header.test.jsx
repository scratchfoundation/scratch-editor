import React from 'react';
import {act, fireEvent} from '@testing-library/react';
import configureStore from 'redux-mock-store';
import {Provider} from 'react-redux';
import VM from '@scratch/scratch-vm';

import {renderWithIntl} from '../../helpers/intl-helpers.jsx';
import StageHeader from '../../../src/components/stage-header/stage-header.jsx';
import {storeProjectThumbnail} from '../../../src/lib/store-project-thumbnail.js';

jest.mock('../../../src/lib/store-project-thumbnail.js', () => ({
    storeProjectThumbnail: jest.fn()
}));

describe('StageHeader Component', () => {
    const store = configureStore()({
        locales: {
            isRtl: false,
            locale: 'en-US'
        },
        scratchGui: {
            vmStatus: {
                running: false,
                turbo: false
            }
        }
    });

    const onShowThumbnailError = jest.fn();
    const onUpdateProjectThumbnail = jest.fn();

    const getComponent = () => (
        <Provider store={store}>
            <StageHeader
                isFullScreen={false}
                isPlayerOnly={false}
                manuallySaveThumbnails
                userOwnsProject
                onKeyPress={jest.fn()}
                onSetStageFull={jest.fn()}
                onSetStageLarge={jest.fn()}
                onSetStageSmall={jest.fn()}
                onSetStageUnFull={jest.fn()}
                onShowSettingThumbnail={jest.fn()}
                onShowThumbnailSuccess={jest.fn()}
                onShowThumbnailError={onShowThumbnailError}
                onUpdateProjectThumbnail={onUpdateProjectThumbnail}
                projectId={'12345'}
                showBranding={false}
                vm={new VM()}
            />
        </Provider>
    );

    const getThumbnailButton = container => container.querySelector('button[title="Set Thumbnail"]');

    const queryConfirmButton = () =>
        [...document.body.querySelectorAll('button')].find(button => button.textContent === 'yes');

    // Returns the prompt's confirm button, or undefined if the thumbnail button did not open the prompt.
    const openThumbnailPrompt = container => {
        fireEvent.click(getThumbnailButton(container));
        return queryConfirmButton();
    };

    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
    });

    test('a capture failure re-enables the thumbnail button and reports the error', () => {
        let reportFailure;
        storeProjectThumbnail.mockImplementation((vm, callback, onError) => {
            reportFailure = onError;
        });

        const {container} = renderWithIntl(getComponent());

        fireEvent.click(openThumbnailPrompt(container));

        // Button implements `disabled` by dropping its onClick rather than by setting the DOM
        // attribute, so a dead thumbnail button is only observable through the prompt not opening.
        expect(openThumbnailPrompt(container)).toBeUndefined();

        act(() => reportFailure(new Error('renderer exploded')));

        expect(onShowThumbnailError).toHaveBeenCalled();
        expect(openThumbnailPrompt(container)).toBeDefined();
    });
});
