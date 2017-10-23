import React from 'react';
import PropTypes from 'prop-types';

import BufferedInputHOC from './forms/buffered-input-hoc.jsx';
import Input from './forms/input.jsx';
import InputGroup from './input-group/input-group.jsx';

import {MAX_STROKE_WIDTH} from '../reducers/stroke-width';

const BufferedInput = BufferedInputHOC(Input);
const StrokeWidthIndicatorComponent = props => (
    <InputGroup>
        <BufferedInput
            small
            max={MAX_STROKE_WIDTH}
            min="0"
            type="number"
            value={props.strokeWidth ? props.strokeWidth : 0}
            onSubmit={props.onChangeStrokeWidth}
        />
    </InputGroup>
);

StrokeWidthIndicatorComponent.propTypes = {
    onChangeStrokeWidth: PropTypes.func.isRequired,
    strokeWidth: PropTypes.number
};

export default StrokeWidthIndicatorComponent;
