import React from 'react';
import PropTypes from 'prop-types';

import BufferedInputHOC from './forms/buffered-input-hoc.jsx';
import Input from './forms/input.jsx';
import {MAX_STROKE_WIDTH} from '../reducers/stroke-width';

import styles from './paint-editor.css';

const BufferedInput = BufferedInputHOC(Input);
const StrokeWidthIndicatorComponent = props => (
    <div className={styles.inputGroup}>
        <BufferedInput
            small
            max={MAX_STROKE_WIDTH}
            min="0"
            type="number"
            value={props.strokeWidth}
            onSubmit={props.onChangeStrokeWidth}
        />
    </div>
);

StrokeWidthIndicatorComponent.propTypes = {
    onChangeStrokeWidth: PropTypes.func.isRequired,
    strokeWidth: PropTypes.string.isRequired
};

export default StrokeWidthIndicatorComponent;
