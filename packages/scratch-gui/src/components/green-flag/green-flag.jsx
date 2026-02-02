import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, {useCallback} from 'react';

import greenFlagIcon from './icon--green-flag.svg';
import styles from './green-flag.css';

const GreenFlagComponent = function (props) {
    const {
        active,
        className,
        onClick,
        title,
        ...componentProps
    } = props;

    // Unfocus so project stage can capture keyboard events for
    // blocks that react to arrow movement for example
    const handleOnClick = useCallback(e => {
        onClick(e);

        const target = e.currentTarget;
        if (target) target.blur();
    }, [onClick]);

    return (
        <button
            className={styles.greenFlagButton}
            onClick={handleOnClick}
            {...componentProps}
        >
            <img
                className={classNames(
                    className,
                    styles.greenFlag,
                    {
                        [styles.isActive]: active
                    }
                )}
                draggable={false}
                src={greenFlagIcon}
                title={title}
            />
        </button>
    );
};
GreenFlagComponent.propTypes = {
    active: PropTypes.bool,
    className: PropTypes.string,
    onClick: PropTypes.func.isRequired,
    title: PropTypes.string
};
GreenFlagComponent.defaultProps = {
    active: false,
    title: 'Go'
};
export default GreenFlagComponent;
