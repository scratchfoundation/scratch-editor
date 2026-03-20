import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';
import styles from './icon-button.css';

const IconButton = ({
    img,
    disabled,
    className,
    title,
    onClick
}) => (
    <button
        className={classNames(
            styles.container,
            className,
            disabled ? styles.disabled : null
        )}
        onClick={onClick}
        disabled={disabled}
    >
        <img
            className={styles.icon}
            draggable={false}
            src={img}
        />
        <div className={styles.title}>
            {title}
        </div>
    </button>
);

IconButton.propTypes = {
    className: PropTypes.string,
    disabled: PropTypes.bool,
    img: PropTypes.string,
    onClick: PropTypes.func.isRequired,
    title: PropTypes.node.isRequired
};

export default IconButton;
