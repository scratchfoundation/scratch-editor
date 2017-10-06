import React from 'react';
import PropTypes from 'prop-types';
import {FormattedMessage} from 'react-intl';

const ReshapeModeComponent = props => (
    <button onClick={props.onMouseDown}>
        <FormattedMessage
            defaultMessage="Reshape"
            description="Label for the reshape tool, which allows changing the points in the lines of the vectors"
            id="paint.reshapeMode.reshape"
        />
    </button>
);

ReshapeModeComponent.propTypes = {
    onMouseDown: PropTypes.func.isRequired
};

export default ReshapeModeComponent;
