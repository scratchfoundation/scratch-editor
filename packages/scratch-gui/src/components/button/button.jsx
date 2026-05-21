import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import styles from './button.css';

const ButtonComponent = ({
    className,
    disabled,
    iconClassName,
    iconSrc,
    onClick,
    children,
    componentRef,
    ...props
}) => {

    if (disabled) {
        onClick = function () {};
    }

    const icon = iconSrc && (
        <img
            className={classNames(iconClassName, styles.icon)}
            draggable={false}
            src={iconSrc}
        />
    );

    return (
        <button
            className={classNames(
                styles.outlinedButton,
                className
            )}
            onClick={onClick}
            ref={componentRef}
            {...props}
        >
            {icon}
            <div className={styles.content}>{children}</div>
        </button>
    );
};

ButtonComponent.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    disabled: PropTypes.bool,
    iconClassName: PropTypes.string,
    iconSrc: PropTypes.string,
    onClick: PropTypes.func,
    componentRef: PropTypes.oneOfType([
        PropTypes.func,
        PropTypes.shape({current: PropTypes.instanceOf(Element)})
    ])
};

export default ButtonComponent;
