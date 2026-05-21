import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessage, useIntl} from 'react-intl';

import stopAllIcon from './icon--stop-all.svg';
import styles from './stop-all.css';

const stopProjectMessage = defineMessage({
    id: 'gui.aria.stopProjectButton',
    defaultMessage: 'Stop project',
    description: 'accessibility label for stop project button'
});

const StopAllComponent = function (props) {
    const {
        active,
        className,
        onClick,
        title,
        isFullScreen,
        ...componentProps
    } = props;

    const intl = useIntl();
    return (
        <button
            className={styles.stopAllButton}
            onClick={onClick}
            aria-label={intl.formatMessage(stopProjectMessage)}
            disabled={!active}
            data-focusable={isFullScreen || null}
            {...componentProps}
        >
            <img
                className={classNames(
                    className,
                    styles.stopAll,
                    {
                        [styles.isActive]: active
                    }
                )}
                draggable={false}
                src={stopAllIcon}
                title={title}
            />
        </button>
    );
};

StopAllComponent.propTypes = {
    isFullScreen: PropTypes.bool,
    active: PropTypes.bool,
    className: PropTypes.string,
    onClick: PropTypes.func.isRequired,
    title: PropTypes.string
};

StopAllComponent.defaultProps = {
    active: false,
    title: 'Stop'
};

export default StopAllComponent;
