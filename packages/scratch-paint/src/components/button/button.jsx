/* DO NOT EDIT
@todo This file is copied from GUI and should be pulled out into a shared library.
See #13 */

/* ACTUALLY, THIS IS EDITED ;)
THIS WAS CHANGED ON 10/25/2017 BY @mewtaylor TO ADD HANDLING FOR DISABLED STATES.*/

import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import styles from './button.css';

const ButtonComponent = ({
    className,
    highlighted,
    onClick,
    children,
    ...props
}) => {
    const disabled = props.disabled || false;
    if (disabled === false) {
        // if not disabled, add `onClick()` to be applied
        // in props. If disabled, don't add `onClick()`
        props.onClick = onClick;
    }
    return (
        <span
            className={classNames(
                styles.button,
                className,
                {
                    [styles.modDisabled]: disabled,
                    [styles.highlighted]: highlighted
                }
            )}
            role="button"
            {...props}
        >
            {children}
        </span>
    );
};

ButtonComponent.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    disabled: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.bool
    ]),
    highlighted: PropTypes.bool,
    onClick: PropTypes.func.isRequired
};
export default ButtonComponent;
