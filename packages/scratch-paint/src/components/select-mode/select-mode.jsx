import React from 'react';
import PropTypes from 'prop-types';
import ToolSelectComponent from '../tool-select-base/tool-select-base.jsx';

import selectIcon from './select.svg';

const SelectModeComponent = props => (
    <ToolSelectComponent
        imgDescriptor={{
            defaultMessage: 'Select',
            description: 'Label for the select tool, which allows selecting, moving, and resizing shapes',
            id: 'paint.selectMode.select'
        }}
        imgSrc={selectIcon}
        isSelected={props.isSelected}
        onMouseDown={props.onMouseDown}
    />
);

SelectModeComponent.propTypes = {
    isSelected: PropTypes.bool.isRequired,
    onMouseDown: PropTypes.func.isRequired
};

export default SelectModeComponent;
