import React, {useMemo} from 'react';
import PropTypes from 'prop-types';
import {defineMessages, FormattedMessage} from 'react-intl';

import Box from '../box/box.jsx';
import ModalWithArrow from '../modal-with-arrow/modal-with-arrow.jsx';

import arrowDownIcon from './icon--arrow-down.svg';
import arrowUpIcon from './icon--arrow-up.svg';
import arrowLeftIcon from './icon--arrow-left.svg';
import arrowRightIcon from './icon--arrow-right.svg';

import styles from './confirmation-prompt.css';
import {PopupAlign, PopupSide} from '../../lib/calculatePopupPosition.js';
import classNames from 'classnames';

const messages = defineMessages({
    defaultConfirmLabel: {
        defaultMessage: 'yes',
        description: 'Label for confirm button in confirmation prompt',
        id: 'gui.confirmationPrompt.confirm'
    },
    defaultCancelLabel: {
        defaultMessage: 'no',
        description: 'Label for cancel button in confirmation prompt',
        id: 'gui.confirmationPrompt.cancel'
    }
});

const defaultConfig = {
    modalWidth: 200,
    spaceForArrow: 16,
    counterOffset: 7,
    arrowOffsetFromBottom: 2,
    arrowWidth: 29,
    arrowHeight: 13
};

const arrowConfig = {
    arrowDownIcon,
    arrowUpIcon,
    arrowLeftIcon,
    arrowRightIcon
};

const BUTTON_ORDER = {
    CANCEL_FIRST: 'cancelFirst',
    CONFIRM_FIRST: 'confirmFirst'
};

const buttonConfigShape = PropTypes.shape({
    label: PropTypes.node,
    icon: PropTypes.string,
    className: PropTypes.string,
    onClick: PropTypes.func.isRequired
});

const ConfirmationPrompt = ({
    title,
    message,
    buttonOrder = BUTTON_ORDER.CANCEL_FIRST,
    isOpen,
    relativeElementRef,
    side,
    align,
    layoutConfig,
    containerClassName,
    messageClassName,
    confirmButtonConfig,
    cancelButtonConfig
}) => {
    const {
        modalWidth,
        spaceForArrow,
        counterOffset,
        arrowOffsetFromBottom,
        arrowHeight,
        arrowWidth
    } = {...defaultConfig, ...layoutConfig};

    const memoizedLayoutConfig = useMemo(() => ({
        modalWidth,
        spaceForArrow,
        counterOffset,
        arrowOffsetFromBottom,
        arrowHeight,
        arrowWidth
    }), [modalWidth,
        spaceForArrow,
        counterOffset,
        arrowOffsetFromBottom,
        arrowHeight,
        arrowWidth
    ]);

    const handleCancel = React.useCallback(() => {
        cancelButtonConfig.onClick();
        // Ensure focus is removed from the button so that keyboard events are propagated to the blocks
        requestAnimationFrame(() => {
            document.activeElement.blur();
        });
    }, [cancelButtonConfig]);

    const handleConfirm = React.useCallback(() => {
        confirmButtonConfig.onClick();
        // Ensure focus is removed from the button so that keyboard events are propagated to the blocks
        requestAnimationFrame(() => {
            document.activeElement.blur();
        });
    }, [confirmButtonConfig]);

    const cancelButton = (
        <button
            onClick={handleCancel}
            className={classNames(styles.cancelButton, cancelButtonConfig.className ?? '')}
        >
            {cancelButtonConfig.icon && (
                <img
                    className={styles.buttonIcon}
                    src={cancelButtonConfig.icon}
                    aria-hidden="true"
                />
            )}
            {cancelButtonConfig.label ?? <FormattedMessage {...messages.defaultCancelLabel} />}
        </button>
    );

    const confirmButton = (
        <button
            onClick={handleConfirm}
            className={classNames(styles.confirmButton, confirmButtonConfig.className ?? '')}
        >
            {confirmButtonConfig.icon && (
                <img
                    className={styles.buttonIcon}
                    src={confirmButtonConfig.icon}
                    aria-hidden="true"
                />
            )}
            {confirmButtonConfig.label ?? <FormattedMessage {...messages.defaultConfirmLabel} />}
        </button>
    );

    const buttons = buttonOrder === BUTTON_ORDER.CONFIRM_FIRST ?
        [confirmButton, cancelButton] : [cancelButton, confirmButton];

    return (
        <ModalWithArrow
            isOpen={isOpen}
            relativeElementRef={relativeElementRef}
            onRequestClose={handleCancel}
            side={side}
            align={align}
            layoutConfig={memoizedLayoutConfig}
            arrowConfig={arrowConfig}
            title={title}
        >
            <Box
                className={classNames(styles.modalContainer, containerClassName)}
            >
                <Box className={classNames(styles.label, messageClassName)}>
                    {message}
                </Box>
                <Box className={styles.buttonRow}>
                    {buttons}
                </Box>
            </Box>
        </ModalWithArrow>
    );
};

ConfirmationPrompt.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    title: PropTypes.string,
    message: PropTypes.node.isRequired,
    buttonOrder: PropTypes.oneOf(Object.values(BUTTON_ORDER)),
    relativeElementRef: PropTypes.shape({current: PropTypes.instanceOf(Element)}),
    side: PropTypes.oneOf(Object.values(PopupSide)).isRequired,
    align: PropTypes.oneOf(Object.values(PopupAlign)),
    layoutConfig: PropTypes.shape({
        modalWidth: PropTypes.number,
        spaceForArrow: PropTypes.number,
        arrowOffsetFromBottom: PropTypes.number,
        counterOffset: PropTypes.number,
        arrowHeight: PropTypes.number,
        arrowWidth: PropTypes.number
    }),
    containerClassName: PropTypes.string,
    messageClassName: PropTypes.string,
    confirmButtonConfig: buttonConfigShape.isRequired,
    cancelButtonConfig: buttonConfigShape.isRequired

};

export {BUTTON_ORDER};
export default ConfirmationPrompt;
