import React from 'react';
import PropTypes from 'prop-types';
import ToolSelectComponent from '../tool-select-base/tool-select-base.jsx';

import lineIcon from './line.svg';

const LineModeComponent = props => (
    <ToolSelectComponent
        imgDescriptor={{
            defaultMessage: 'Line',
            description: 'Label for the line tool, which draws straight line segments',
            id: 'paint.lineMode.line'
        }}
        imgSrc={lineIcon}
        isSelected={props.isSelected}
        onMouseDown={props.onMouseDown}
    />
);

LineModeComponent.propTypes = {
    isSelected: PropTypes.bool.isRequired,
    onMouseDown: PropTypes.func.isRequired
};

export default LineModeComponent;
