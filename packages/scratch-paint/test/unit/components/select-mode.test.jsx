/* eslint-env jest */
import React from 'react'; // eslint-disable-line no-unused-vars
import {shallow} from 'enzyme';
import SelectModeComponent from '../../../src/components/select-mode.jsx'; // eslint-disable-line no-unused-vars

describe('SelectModeComponent', () => {
    test('triggers callback when clicked', () => {
        const onClick = jest.fn();
        const componentShallowWrapper = shallow(
            <SelectModeComponent onMouseDown={onClick}/>
        );
        componentShallowWrapper.simulate('click');
        expect(onClick).toHaveBeenCalled();
    });
});
