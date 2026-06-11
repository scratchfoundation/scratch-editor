import classNames from 'classnames';
import React from 'react';
import PropTypes from 'prop-types';
import {useIntl} from 'react-intl';

import Button from '../button/button.jsx';

import styles from './tool-select-base.css';

const ToolSelectComponent = props => {
    const intl = useIntl();
    return (
        <Button
            className={
                classNames(props.className, styles.modToolSelect, {
                    [styles.isSelected]: props.isSelected
                })
            }
            disabled={props.disabled}
            title={intl.formatMessage(props.imgDescriptor)}
            onClick={props.onMouseDown}
        >
            <img
                alt={intl.formatMessage(props.imgDescriptor)}
                className={styles.toolSelectIcon}
                draggable={false}
                src={props.imgSrc}
            />
        </Button>
    );
};

ToolSelectComponent.propTypes = {
    className: PropTypes.string,
    disabled: PropTypes.bool,
    imgDescriptor: PropTypes.shape({
        defaultMessage: PropTypes.string,
        description: PropTypes.string,
        id: PropTypes.string
    }).isRequired,
    imgSrc: PropTypes.string.isRequired,
    isSelected: PropTypes.bool.isRequired,
    onMouseDown: PropTypes.func.isRequired
};

export default ToolSelectComponent;
