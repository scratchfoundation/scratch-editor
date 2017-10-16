import React from 'react';
import PropTypes from 'prop-types';
import {FormattedMessage} from 'react-intl';

const OvalModeComponent = props => (
    <button onClick={props.onMouseDown}>
        <FormattedMessage
            defaultMessage="Circle"
            description="Label for the oval-drawing tool"
            id="paint.ovalMode.oval"
        />
    </button>
);

OvalModeComponent.propTypes = {
    onMouseDown: PropTypes.func.isRequired
};

export default OvalModeComponent;
