/* DO NOT EDIT
@todo This file is copied from GUI and should be pulled out into a shared library.
See https://github.com/LLK/scratch-paint/issues/13 */

import PropTypes from 'prop-types';
import React from 'react';

import styles from './label.css';

const Label = props => (
    <label className={styles.inputGroup}>
        <span className={props.secondary ? styles.inputLabelSecondary : styles.inputLabel}>
            {props.text}
        </span>
        {props.children}
    </label>
);

Label.propTypes = {
    children: PropTypes.node,
    secondary: PropTypes.bool,
    text: PropTypes.string.isRequired
};

Label.defaultProps = {
    secondary: false
};

export default Label;
