/* eslint-env jest */
import React from 'react'; // eslint-disable-line no-unused-vars
import {shallow} from 'enzyme';
import EraserModeComponent from '../../../src/components/eraser-mode.jsx'; // eslint-disable-line no-unused-vars

describe('EraserModeComponent', () => {
    test('triggers callback when clicked', () => {
        const onClick = jest.fn();
        const componentShallowWrapper = shallow(
            <EraserModeComponent onMouseDown={onClick}/>
        );
        componentShallowWrapper.simulate('click');
        expect(onClick).toHaveBeenCalled();
    });
});
