import classNames from 'classnames';
import React from 'react';
import PropTypes from 'prop-types';

import Button from '../../button/button.jsx';

import styles from './edit-field-button.css';

const EditFieldButton = props => (
    <Button
        className={classNames(props.className, styles.modEditField)}
        onClick={props.onClick}
    >
        <img
            alt={props.imgAlt}
            className={styles.editFieldIcon}
            src={props.imgSrc}
        />
        <span className={styles.editFieldTitle}>{props.title}</span>
    </Button>
);

EditFieldButton.propTypes = {
    className: PropTypes.string,
    imgAlt: PropTypes.string.isRequired,
    imgSrc: PropTypes.string.isRequired,
    onClick: PropTypes.func.isRequired,
    title: PropTypes.string.isRequired
};

export default EditFieldButton;
