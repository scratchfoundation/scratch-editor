import React from 'react';
import PropTypes from 'prop-types';

import styles from './color-button.css';

const ColorButtonComponent = props => (
    <div
        className={styles.colorButton}
        onClick={props.onClick}
    >
        <div
            className={styles.colorButtonSwatch}
            style={{
                background: props.color
            }}
        />
        <div className={styles.colorButtonArrow}>▾</div>
    </div>
);

ColorButtonComponent.propTypes = {
    color: PropTypes.string,
    onClick: PropTypes.func.isRequired
};

export default ColorButtonComponent;
