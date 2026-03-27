import React from 'react';
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

const ConfirmationPrompt = ({
    title,
    message,
    confirmLabel,
    cancelLabel,
    confirmIcon,
    cancelIcon,
    buttonOrder = BUTTON_ORDER.CANCEL_FIRST,
    onConfirm,
    onCancel,
    isOpen,
    relativeElementRef,
    side,
    align,
    layoutConfig,
    containerClassName,
    messageClassName,
    confirmButtonClassName,
    cancelButtonClassName
}) => {
    const {
        modalWidth,
        spaceForArrow,
        counterOffset,
        arrowOffsetFromBottom,
        arrowHeight,
        arrowWidth
    } = {...defaultConfig, ...layoutConfig};

    const memoizedLayoutConfig = React.useMemo(() => ({
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

    const cancelButton = (
        <button
            onClick={onCancel}
            className={classNames(styles.cancelButton, cancelButtonClassName)}
        >
            {cancelIcon && (
                <img
                    className={styles.buttonIcon}
                    src={cancelIcon}
                    aria-hidden="true"
                    alt=""
                />
            )}
            {cancelLabel ?? <FormattedMessage {...messages.defaultCancelLabel} />}
        </button>
    );

    const confirmButton = (
        <button
            onClick={onConfirm}
            className={classNames(styles.confirmButton, confirmButtonClassName)}
        >
            {confirmIcon && (
                <img
                    className={styles.buttonIcon}
                    src={confirmIcon}
                    aria-hidden="true"
                    alt=""
                />
            )}
            {confirmLabel ?? <FormattedMessage {...messages.defaultConfirmLabel} />}
        </button>
    );

    const buttons = buttonOrder === BUTTON_ORDER.CONFIRM_FIRST ?
        [confirmButton, cancelButton] : [cancelButton, confirmButton];

    return (
        <ModalWithArrow
            isOpen={isOpen}
            relativeElementRef={relativeElementRef}
            onRequestClose={onCancel}
            side={side}
            align={align}
            layoutConfig={memoizedLayoutConfig}
            arrowConfig={arrowConfig}
            title={title}
        >
            <Box className={classNames(styles.modalContainer, containerClassName)}>
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
    confirmLabel: PropTypes.node,
    cancelLabel: PropTypes.node,
    confirmIcon: PropTypes.string,
    cancelIcon: PropTypes.string,
    buttonOrder: PropTypes.oneOf(Object.values(BUTTON_ORDER)),
    onConfirm: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
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
    confirmButtonClassName: PropTypes.string,
    cancelButtonClassName: PropTypes.string
};

export {BUTTON_ORDER};
export default ConfirmationPrompt;
