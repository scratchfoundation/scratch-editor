import classNames from 'classnames';
import React from 'react';
import PropTypes from 'prop-types';

import styles from './button-group.css';

const ButtonGroup = props => (
    <div className={classNames(props.className, styles.buttonGroup)}>
        {props.children}
    </div>
);

ButtonGroup.propTypes = {
    children: PropTypes.node.isRequired,
    className: PropTypes.string
};

export default ButtonGroup;
