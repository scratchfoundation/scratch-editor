import React from 'react';
import PropTypes from 'prop-types';
import {FormattedMessage} from 'react-intl';

const LineModeComponent = props => (
    <button onClick={props.onMouseDown}>
        <FormattedMessage
            defaultMessage="Line"
            description="Label for the line tool, which draws straight line segments"
            id="paint.lineMode.line"
        />
    </button>
);

LineModeComponent.propTypes = {
    onMouseDown: PropTypes.func.isRequired
};

export default LineModeComponent;
