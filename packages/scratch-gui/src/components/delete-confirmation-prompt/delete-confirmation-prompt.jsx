import {defineMessages, FormattedMessage, useIntl} from 'react-intl';
import React, {useRef} from 'react';
import PropTypes from 'prop-types';
import ReactModal from 'react-modal';
import Box from '../box/box.jsx';
import PopupWithArrow from '../popup-with-arrow/popup-with-arrow.jsx';
import {PopupSide, PopupAlign} from '../../lib/calculatePopupPosition.js';

import deleteIcon from './icon--delete.svg';
import undoIcon from './icon--undo.svg';
import arrowLeftIcon from './icon--arrow-left.svg';
import arrowRightIcon from './icon--arrow-right.svg';

import styles from './delete-confirmation-prompt.css';

// TODO: Parametrize from outside if we want more custom messaging
const messages = defineMessages({
    shouldDeleteSpriteMessage: {
        defaultMessage: 'Are you sure you want to delete this sprite?',
        description: 'Message to indicate whether selected sprite should be deleted.',
        id: 'gui.gui.shouldDeleteSprite'
    },
    shouldDeleteCostumeMessage: {
        defaultMessage: 'Are you sure you want to delete this costume?',
        description: 'Message to indicate whether selected costume should be deleted.',
        id: 'gui.gui.shouldDeleteCostume'
    },
    shouldDeleteSoundMessage: {
        defaultMessage: 'Are you sure you want to delete this sound?',
        description: 'Message to indicate whether selected sound should be deleted.',
        id: 'gui.gui.shouldDeleteSound'
    },
    confirmOption: {
        defaultMessage: 'yes',
        description: 'Yes - should delete the sprite',
        id: 'gui.gui.confirm'
    },
    cancelOption: {
        defaultMessage: 'no',
        description: 'No - cancel deletion',
        id: 'gui.gui.cancel'
    },
    confirmDeletionHeading: {
        defaultMessage: 'Confirm Asset Deletion',
        description: 'Heading of confirmation prompt to delete asset',
        id: 'gui.gui.deleteAssetHeading'
    }
});

const modalWidth = 300;
const arrowWidth = 25;
const arrowHeight = 14;

const arrowConfig = {
    arrowDownIcon: null,
    arrowUpIcon: null,
    arrowLeftIcon,
    arrowRightIcon
};

const getMessage = entityType => {
    if (entityType === 'COSTUME') {
        return messages.shouldDeleteCostumeMessage;
    }

    if (entityType === 'SOUND') {
        return messages.shouldDeleteSoundMessage;
    }

    return messages.shouldDeleteSpriteMessage;
};

const MODAL_POSITION_TO_SIDE = {
    left: PopupSide.LEFT,
    right: PopupSide.RIGHT
};

const DeleteConfirmationPrompt = ({
    onCancel,
    onOk,
    modalPosition,
    entityType,
    relativeElemRef
}) => {
    const intl = useIntl();

    const relativeElementRef = useRef(relativeElemRef);
    relativeElementRef.current = relativeElemRef;

    const side = MODAL_POSITION_TO_SIDE[modalPosition] ?? PopupSide.RIGHT;

    return (
        <PopupWithArrow
            isOpen
            onRequestClose={onCancel}
            relativeElementRef={relativeElementRef}
            side={side}
            align={PopupAlign.CENTER}
            layoutConfig={{
                popupWidth: modalWidth,
                spaceForArrow: arrowWidth,
                arrowHeight,
                arrowWidth,
                counterOffset: 0,
                arrowOffsetFromBottom: 2
            }}
            arrowConfig={arrowConfig}
        >
            {({popupRef, pos}) => (
                <ReactModal
                    isOpen
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
                    contentLabel={intl.formatMessage(messages.confirmDeletionHeading)}
                    onRequestClose={onCancel}
                >
                    <Box
                        className={styles.modalContainer}
                        componentRef={popupRef}
                    >
                        <Box className={styles.body}>
                            <Box className={styles.label}>
                                <FormattedMessage {...getMessage(entityType)} />
                            </Box>
                            <Box className={styles.buttonRow}>
                                <button
                                    className={styles.okButton}
                                    onClick={onOk}
                                    role="button"
                                >
                                    <img
                                        className={styles.deleteIcon}
                                        src={deleteIcon}
                                    />
                                    <div className={styles.message}>
                                        <FormattedMessage {...messages.confirmOption} />
                                    </div>
                                </button>
                                <button
                                    className={styles.cancelButton}
                                    onClick={onCancel}
                                    role="button"
                                >
                                    <img
                                        className={styles.deleteIcon}
                                        src={undoIcon}
                                    />
                                    <div className={styles.message}>
                                        <FormattedMessage {...messages.cancelOption} />
                                    </div>
                                </button>
                            </Box>
                        </Box>
                    </Box>
                </ReactModal>
            )}
        </PopupWithArrow>
    );
};

DeleteConfirmationPrompt.propTypes = {
    onOk: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    relativeElemRef: PropTypes.object,
    entityType: PropTypes.string,
    modalPosition: PropTypes.string
};

export default DeleteConfirmationPrompt;
