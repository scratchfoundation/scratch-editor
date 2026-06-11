import React from 'react';
import PropTypes from 'prop-types';
import messages from '../../lib/messages.js';
import ToolSelectComponent from '../tool-select-base/tool-select-base.jsx';

import reshapeIcon from './reshape.svg';

const ReshapeModeComponent = props => (
    <ToolSelectComponent
        imgDescriptor={messages.reshape}
        imgSrc={reshapeIcon}
        isSelected={props.isSelected}
        onMouseDown={props.onMouseDown}
    />
);

ReshapeModeComponent.propTypes = {
    isSelected: PropTypes.bool.isRequired,
    onMouseDown: PropTypes.func.isRequired
};

export default ReshapeModeComponent;
