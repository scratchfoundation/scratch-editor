/* eslint-env jest */
import React from 'react'; // eslint-disable-line no-unused-vars
import {shallow} from 'enzyme';
import LineModeComponent from '../../../src/components/line-mode.jsx'; // eslint-disable-line no-unused-vars

describe('LineModeComponent', () => {
    test('triggers callback when clicked', () => {
        const onClick = jest.fn();
        const componentShallowWrapper = shallow(
            <LineModeComponent onMouseDown={onClick}/>
        );
        componentShallowWrapper.simulate('click');
        expect(onClick).toHaveBeenCalled();
    });
});
