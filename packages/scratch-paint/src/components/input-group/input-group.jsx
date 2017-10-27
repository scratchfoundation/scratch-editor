import classNames from 'classnames';
import React from 'react';
import PropTypes from 'prop-types';

import styles from './input-group.css';

const InputGroup = props => (
    <div
        className={classNames(props.className, styles.inputGroup, {
            [styles.disabled]: props.disabled
        })}
    >
        {props.children}
    </div>
);

InputGroup.propTypes = {
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
    disabled: PropTypes.bool
};

export default InputGroup;
