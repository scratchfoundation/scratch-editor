/* eslint-env jest */
import React from 'react'; // eslint-disable-line no-unused-vars
import {shallow} from 'enzyme';
import ReshapeModeComponent from '../../../src/components/reshape-mode.jsx'; // eslint-disable-line no-unused-vars

describe('ReshapeModeComponent', () => {
    test('triggers callback when clicked', () => {
        const onClick = jest.fn();
        const componentShallowWrapper = shallow(
            <ReshapeModeComponent onMouseDown={onClick}/>
        );
        componentShallowWrapper.simulate('click');
        expect(onClick).toHaveBeenCalled();
    });
});
