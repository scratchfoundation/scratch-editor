import React from 'react';
import PropTypes from 'prop-types';

import Input from './forms/input.jsx';
import InputGroup from './input-group/input-group.jsx';
import LiveInputHOC from './forms/live-input-hoc.jsx';

import {MAX_STROKE_WIDTH} from '../reducers/stroke-width';

const LiveInput = LiveInputHOC(Input);
const StrokeWidthIndicatorComponent = props => (
    <InputGroup disabled={props.disabled}>
        <LiveInput
            range
            small
            disabled={props.disabled}
            max={MAX_STROKE_WIDTH}
            min="0"
            type="number"
            value={props.strokeWidth ? props.strokeWidth : 0}
            onSubmit={props.onChangeStrokeWidth}
        />
    </InputGroup>
);

StrokeWidthIndicatorComponent.propTypes = {
    disabled: PropTypes.bool.isRequired,
    onChangeStrokeWidth: PropTypes.func.isRequired,
    strokeWidth: PropTypes.number
};

export default StrokeWidthIndicatorComponent;
