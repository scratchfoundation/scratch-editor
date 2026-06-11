import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';

import styles from './delete-button.css';
import deleteIcon from './icon--delete.svg';

const DeleteButton = props => (
    <button
        aria-label="Delete"
        className={classNames(
            styles.deleteButton,
            props.className
        )}
        tabIndex={props.tabIndex}
        onClick={props.onClick}
    >
        <div
            className={classNames(styles.deleteButtonVisible, {
                [styles.deleteButtonClicked]: props.isConfirmationModalOpened
            })}
        >
            <img
                className={styles.deleteIcon}
                src={deleteIcon}
            />
        </div>
    </button>
);

DeleteButton.propTypes = {
    className: PropTypes.string,
    onClick: PropTypes.func.isRequired,
    isConfirmationModalOpened: PropTypes.bool,
    tabIndex: PropTypes.number
};

DeleteButton.defaultProps = {
    tabIndex: 0
};

export default DeleteButton;
