/* eslint-env jest */
import React from 'react'; // eslint-disable-line no-unused-vars
import {shallow} from 'enzyme';
import BrushModeComponent from '../../../src/components/brush-mode.jsx'; // eslint-disable-line no-unused-vars

describe('BrushModeComponent', () => {
    test('triggers callback when clicked', () => {
        const onClick = jest.fn();
        const componentShallowWrapper = shallow(
            <BrushModeComponent onMouseDown={onClick}/>
        );
        componentShallowWrapper.simulate('click');
        expect(onClick).toHaveBeenCalled();
    });
});
