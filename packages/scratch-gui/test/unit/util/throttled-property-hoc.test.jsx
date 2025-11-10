import React from 'react';
import {render} from '@testing-library/react';

import ThrottledPropertyHOC from '../../../src/lib/throttled-property-hoc.jsx';

describe('VMListenerHOC', () => {
    let component;
    const throttleTime = 500;
    let WrappedComponent;
    beforeEach(() => {
        const Component = ({propToThrottle, doNotThrottle}) => (
            <input
                name={doNotThrottle}
                value={propToThrottle}
            />
        );
        WrappedComponent = ThrottledPropertyHOC('propToThrottle', throttleTime)(Component);

        global.Date.now = () => 0;

        component = render(
            <WrappedComponent
                doNotThrottle="oldvalue"
                propToThrottle={0}
            />
        );
    });

    test('it passes the props on initial render ', () => {
        const {container} = component;
        expect(container.querySelector('input').value).toEqual('0');
        expect(container.querySelector('input').name).toEqual('oldvalue');
    });

    test('it does not rerender if throttled prop is updated too soon', () => {
        const {container, rerender} = component;
        global.Date.now = () => throttleTime / 2;
        rerender(
            <WrappedComponent
                doNotThrottle="oldvalue"
                propToThrottle={1}
            />
        );
        expect(container.querySelector('input').value).toEqual('0');
    });

    test('it does rerender if throttled prop is updated after throttle timeout', () => {
        const {container, rerender} = component;
        global.Date.now = () => throttleTime * 2;
        rerender(
            <WrappedComponent
                doNotThrottle="oldvalue"
                propToThrottle={1}
            />
        );
        expect(container.querySelector('input').value).toEqual('1');
    });

    test('it does rerender if a non-throttled prop is changed', () => {
        const {container, rerender} = component;
        global.Date.now = () => throttleTime / 2;
        rerender(
            <WrappedComponent
                doNotThrottle="newvalue"
                propToThrottle={2}
            />
        );
        expect(container.querySelector('input').value).toEqual('2');
        expect(container.querySelector('input').name).toEqual('newvalue');
    });
});
