import React from 'react';
import PropTypes from 'prop-types';
import {FormattedMessage} from 'react-intl';

const BrushModeComponent = props => (
    <button onClick={props.onMouseDown}>
        <FormattedMessage
            defaultMessage="Brush"
            description="Label for the brush tool"
            id="paint.brushMode.brush"
        />
    </button>
);

BrushModeComponent.propTypes = {
    onMouseDown: PropTypes.func.isRequired
};

export default BrushModeComponent;
