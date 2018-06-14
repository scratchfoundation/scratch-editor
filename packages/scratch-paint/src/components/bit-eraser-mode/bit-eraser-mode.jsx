import React from 'react';
import PropTypes from 'prop-types';

import ToolSelectComponent from '../tool-select-base/tool-select-base.jsx';

import eraserIcon from './eraser.svg';

const BitEraserComponent = props => (
    <ToolSelectComponent
        imgDescriptor={{
            defaultMessage: 'Eraser',
            description: 'Label for the eraser tool',
            id: 'paint.eraserMode.eraser'
        }}
        imgSrc={eraserIcon}
        isSelected={props.isSelected}
        onMouseDown={props.onMouseDown}
    />
);

BitEraserComponent.propTypes = {
    isSelected: PropTypes.bool.isRequired,
    onMouseDown: PropTypes.func.isRequired
};

export default BitEraserComponent;
