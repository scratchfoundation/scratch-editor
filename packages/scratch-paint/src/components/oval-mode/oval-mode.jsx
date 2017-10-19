import React from 'react';
import PropTypes from 'prop-types';
import ToolSelectComponent from '../tool-select-base/tool-select-base.jsx';

import ovalIcon from './oval.svg';

const OvalModeComponent = props => (
    <ToolSelectComponent
        imgDescriptor={{
            defaultMessage: 'Circle',
            description: 'Label for the oval-drawing tool',
            id: 'paint.ovalMode.oval'
        }}
        imgSrc={ovalIcon}
        isSelected={props.isSelected}
        onMouseDown={props.onMouseDown}
    />
);

OvalModeComponent.propTypes = {
    isSelected: PropTypes.bool.isRequired,
    onMouseDown: PropTypes.func.isRequired
};

export default OvalModeComponent;
