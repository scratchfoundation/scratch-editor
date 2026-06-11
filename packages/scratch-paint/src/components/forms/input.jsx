/* DO NOT EDIT
@todo This file is copied from GUI and should be pulled out into a shared library.
See https://github.com/LLK/scratch-paint/issues/13 */

/* NOTE:
Edited to add range prop
*/

import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';

import styles from './input.css';

const Input = props => {
    const {small, range, ...componentProps} = props;
    return (
        <input
            {...componentProps}
            className={classNames(
                styles.inputForm,
                props.className,
                {
                    [styles.inputSmall]: small && !range,
                    [styles.inputSmallRange]: small && range
                }
            )}
        />
    );
};

Input.propTypes = {
    className: PropTypes.string,
    range: PropTypes.bool,
    small: PropTypes.bool
};

Input.defaultProps = {
    range: false,
    small: false
};

export default Input;
