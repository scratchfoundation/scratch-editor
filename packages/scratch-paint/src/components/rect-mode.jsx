import React from 'react';
import PropTypes from 'prop-types';
import {FormattedMessage} from 'react-intl';

const RectModeComponent = props => (
    <button onClick={props.onMouseDown}>
        <FormattedMessage
            defaultMessage="Rectangle"
            description="Label for the rectangle tool"
            id="paint.rectMode.rect"
        />
    </button>
);

RectModeComponent.propTypes = {
    onMouseDown: PropTypes.func.isRequired
};

export default RectModeComponent;
