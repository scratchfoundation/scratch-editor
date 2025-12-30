import React from 'react';
import {render} from '@testing-library/react';
import Monitor from '../../../src/components/monitor/monitor';
import {DARK_MODE, DEFAULT_MODE} from '../../../src/lib/settings/color-mode';

jest.mock('../../../src/lib/settings/color-mode/default');
jest.mock('../../../src/lib/settings/color-mode/dark');

describe('Monitor Component', () => {
    const noop = jest.fn();

    const defaultProps = {
        category: 'motion',
         
        componentRef: noop,
        draggable: false,
        label: 'My label',
        mode: 'default',
         
        onDragEnd: noop,
         
        onNextMode: noop
    };

    test('it selects the correct colors based on default color mode', () => {
        const {container} = render(<Monitor
            {...defaultProps}
            colorMode={DEFAULT_MODE}
        />);

        expect(container.firstChild).toMatchSnapshot();
    });

    test('it selects the correct colors based on dark mode', () => {
        const {container} = render(<Monitor
            {...defaultProps}
            colorMode={DARK_MODE}
        />);

        expect(container.firstChild).toMatchSnapshot();
    });
});
