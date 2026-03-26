import React from 'react';
import PropTypes from 'prop-types';
import ReactModal from 'react-modal';
import {defineMessages, FormattedMessage} from 'react-intl';

import Box from '../box/box.jsx';
import PopupWithArrow from '../popup-with-arrow/popup-with-arrow.jsx';

import arrowDownIcon from './icon--arrow-down.svg';
import arrowUpIcon from './icon--arrow-up.svg';
import arrowLeftIcon from './icon--arrow-left.svg';
import arrowRightIcon from './icon--arrow-right.svg';

import styles from './confirmation-prompt.css';
import {PopupAlign, PopupSide} from '../../lib/calculatePopupPosition.js';

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

const ConfirmationPrompt = ({
    title,
    message,
    confirmLabel,
    cancelLabel,
    onConfirm,
    onCancel,
    isOpen,
    relativeElementRef,
    side,
    align,
    layoutConfig
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
        popupWidth: modalWidth,
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

    return (
        <PopupWithArrow
            isOpen={isOpen}
            relativeElementRef={relativeElementRef}
            side={side}
            align={align}
            layoutConfig={memoizedLayoutConfig}
            arrowConfig={arrowConfig}
        >
            {({popupRef, pos}) => (
                <ReactModal
                    isOpen
                    onRequestClose={onCancel}
                    contentLabel={title}
                    style={{
                        content: {
                            top: pos.top,
                            left: pos.left,
                            width: modalWidth,
                            border: 'none',
                            height: 'fit-content',
                            backgroundColor: 'transparent',
                            padding: 0,
                            margin: 0,
                            position: 'fixed',
                            overflowX: 'hidden',
                            zIndex: 1000
                        },
                        overlay: {
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 510,
                            backgroundColor: 'transparent'
                        }
                    }}
                >
                    <Box
                        className={styles.modalContainer}
                        componentRef={popupRef}
                    >
                        <Box className={styles.label}>
                            {message}
                        </Box>
                        <Box className={styles.buttonRow}>
                            <button
                                onClick={onCancel}
                                className={styles.cancelButton}
                            >
                                {cancelLabel ?? <FormattedMessage {...messages.defaultCancelLabel} />}
                            </button>
                            <button
                                onClick={onConfirm}
                                className={styles.confirmButton}
                            >
                                {confirmLabel ?? <FormattedMessage {...messages.defaultConfirmLabel} />}
                            </button>
                        </Box>
                    </Box>
                </ReactModal>
            )}
        </PopupWithArrow>
    );
};

ConfirmationPrompt.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    title: PropTypes.string,
    message: PropTypes.node.isRequired,
    confirmLabel: PropTypes.node,
    cancelLabel: PropTypes.node,
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
    })
};

export default ConfirmationPrompt;
