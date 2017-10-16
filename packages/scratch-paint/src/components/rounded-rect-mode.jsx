import React from 'react';
import PropTypes from 'prop-types';
import {FormattedMessage} from 'react-intl';

const RoundedRectModeComponent = props => (
    <button onClick={props.onMouseDown}>
        <FormattedMessage
            defaultMessage="Rounded Rectangle"
            description="Label for the rounded rectangle tool"
            id="paint.roundedRectMode.roundedRect"
        />
    </button>
);

RoundedRectModeComponent.propTypes = {
    onMouseDown: PropTypes.func.isRequired
};

export default RoundedRectModeComponent;
