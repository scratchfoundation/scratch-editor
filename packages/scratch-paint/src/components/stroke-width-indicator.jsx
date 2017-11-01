import React from 'react';
import PropTypes from 'prop-types';

import Input from './forms/input.jsx';
import InputGroup from './input-group/input-group.jsx';

import {MAX_STROKE_WIDTH} from '../reducers/stroke-width';

const StrokeWidthIndicatorComponent = props => (
    <InputGroup disabled={props.disabled}>
        <Input
            small
            disabled={props.disabled}
            max={MAX_STROKE_WIDTH}
            min="0"
            type="number"
            value={props.strokeWidth ? props.strokeWidth : 0}
            onChange={function (e) {
                if (e.target.value !== null && !isNaN(e.target.value)) {
                    props.onChangeStrokeWidth(Number(e.target.value));
                }

            }}
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
