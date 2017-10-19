import React from 'react';
import PropTypes from 'prop-types';
import ToolSelectComponent from '../tool-select-base/tool-select-base.jsx';

import roundedRectIcon from './rounded-rectangle.svg';

const RoundedRectModeComponent = props => (
    <ToolSelectComponent
        imgDescriptor={{
            defaultMessage: 'Rounded Rectangle',
            description: 'Label for the rounded rectangle tool',
            id: 'paint.roundedRectMode.roundedRect'
        }}
        imgSrc={roundedRectIcon}
        isSelected={props.isSelected}
        onMouseDown={props.onMouseDown}
    />
);

RoundedRectModeComponent.propTypes = {
    isSelected: PropTypes.bool.isRequired,
    onMouseDown: PropTypes.func.isRequired
};

export default RoundedRectModeComponent;
