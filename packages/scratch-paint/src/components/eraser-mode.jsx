import React from 'react';
import PropTypes from 'prop-types';
import {FormattedMessage} from 'react-intl';

const EraserModeComponent = props => (
    <button onClick={props.onMouseDown}>
        <FormattedMessage
            defaultMessage="Eraser"
            description="Label for the eraser tool"
            id="paint.eraserMode.eraser"
        />
    </button>
);

EraserModeComponent.propTypes = {
    onMouseDown: PropTypes.func.isRequired
};

export default EraserModeComponent;
