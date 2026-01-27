import PropTypes from 'prop-types';
import React from 'react';

import styles from './label.css';

const Label = React.forwardRef((props, ref) => (
    <label
        ref={ref}
        className={props.above ? styles.inputGroupColumn : styles.inputGroup}
    >
        <span className={props.secondary ? styles.inputLabelSecondary : styles.inputLabel}>
            {props.text}
        </span>
        {props.children}
    </label>
));

Label.displayName = 'Label';

Label.propTypes = {
    above: PropTypes.bool,
    children: PropTypes.node,
    secondary: PropTypes.bool,
    text: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired
};

Label.defaultProps = {
    above: false,
    secondary: false
};

export default Label;
