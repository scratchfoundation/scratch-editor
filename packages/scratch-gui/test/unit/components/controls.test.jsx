import React from 'react';
import {fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import {renderWithIntl} from '../../helpers/intl-helpers.jsx';
import Controls from '../../../src/components/controls/controls';

describe('Controls component', () => {
    const defaultProps = () => ({
        active: false,
        onGreenFlagClick: jest.fn(),
        onStopAllClick: jest.fn(),
        turbo: false
    });

    test('shows turbo mode when in turbo mode', () => {
        const {container: containerTurbo} = renderWithIntl(<Controls
            {...defaultProps()}
            turbo
        />);
        const turboMode = [...containerTurbo.querySelectorAll('div')].reverse().find(el => el.textContent.includes('Turbo Mode'));
        expect(turboMode).toBeTruthy();
    });

    test('does not show turbo mode when not in turbo mode', () => {
        const {container: containerNoTurbo} = renderWithIntl(<Controls {...defaultProps()} />);
        const noTurboMode = [...containerNoTurbo.querySelectorAll('div')].reverse().find(el => el.textContent.includes('Turbo Mode'));
        expect(noTurboMode).toBeFalsy();
    });

    describe('triggers the right callbacks when clicked', () => {
        test('when green flag button clicked triggers the right callback', () => {
            const props = defaultProps();
            const {container} = renderWithIntl(<Controls {...props} />);

            const greenFlagButton = container.querySelector('img[title="Go"]');

            fireEvent.click(greenFlagButton);
            expect(props.onGreenFlagClick).toHaveBeenCalled();
        });

        test('when stop all button clicked triggers the right callback', () => {
            const props = defaultProps();
            const {container} = renderWithIntl(<Controls {...props} />);

            const stopAllButton = container.querySelector('img[title="Stop"]');

            fireEvent.click(stopAllButton);
            expect(props.onStopAllClick).toHaveBeenCalled();
        });
    });
});
