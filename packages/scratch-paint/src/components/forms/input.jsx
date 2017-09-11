/* DO NOT EDIT
@todo This file is copied from GUI and should be pulled out into a shared library.
See https://github.com/LLK/scratch-paint/issues/13 */

import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';

import styles from './input.css';

const Input = props => {
    const {small, ...componentProps} = props;
    return (
        <input
            {...componentProps}
            className={classNames(styles.inputForm, {
                [styles.inputSmall]: small
            })}
        />
    );
};

Input.propTypes = {
    small: PropTypes.bool
};

Input.defaultProps = {
    small: false
};

export default Input;
