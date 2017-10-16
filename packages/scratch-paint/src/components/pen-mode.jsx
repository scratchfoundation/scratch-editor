import React from 'react';
import PropTypes from 'prop-types';
import {FormattedMessage} from 'react-intl';

const PenModeComponent = props => (
    <button onClick={props.onMouseDown}>
        <FormattedMessage
            defaultMessage="Pen"
            description="Label for the pen tool, which draws outlines"
            id="paint.penMode.pen"
        />
    </button>
);

PenModeComponent.propTypes = {
    onMouseDown: PropTypes.func.isRequired
};

export default PenModeComponent;
