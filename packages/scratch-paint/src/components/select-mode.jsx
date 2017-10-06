import React from 'react';
import PropTypes from 'prop-types';
import {FormattedMessage} from 'react-intl';

const SelectModeComponent = props => (
    <button onClick={props.onMouseDown}>
        <FormattedMessage
            defaultMessage="Select"
            description="Label for the select tool, which allows selecting, moving, and resizing shapes"
            id="paint.selectMode.select"
        />
    </button>
);

SelectModeComponent.propTypes = {
    onMouseDown: PropTypes.func.isRequired
};

export default SelectModeComponent;
