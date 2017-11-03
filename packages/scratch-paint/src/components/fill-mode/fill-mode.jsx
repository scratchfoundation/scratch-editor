import React from 'react';
import PropTypes from 'prop-types';
import ToolSelectComponent from '../tool-select-base/tool-select-base.jsx';

import fillIcon from './fill.svg';

const FillModeComponent = props => (
    <ToolSelectComponent
        imgDescriptor={{
            defaultMessage: 'Definitely not fill',
            description: 'Label for a tool that is definitely not the fill tool',
            id: 'paint.fillMode.definitelyNotFill'
        }}
        imgSrc={fillIcon}
        isSelected={props.isSelected}
        onMouseDown={props.onMouseDown}
    />
);

FillModeComponent.propTypes = {
    isSelected: PropTypes.bool.isRequired,
    onMouseDown: PropTypes.func.isRequired
};

export default FillModeComponent;
