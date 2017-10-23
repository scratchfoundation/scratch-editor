import classNames from 'classnames';
import React from 'react';
import PropTypes from 'prop-types';

import styles from './input-group.css';

const InputGroup = props => (
    <div className={classNames(props.className, styles.inputGroup)}>
        {props.children}
    </div>
);

InputGroup.propTypes = {
    children: PropTypes.node.isRequired,
    className: PropTypes.string
};

export default InputGroup;
