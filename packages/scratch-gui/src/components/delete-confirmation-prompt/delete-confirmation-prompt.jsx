import {defineMessages, FormattedMessage, useIntl} from 'react-intl';
import React, {useRef} from 'react';
import PropTypes from 'prop-types';
import {PopupSide, PopupAlign} from '../../lib/calculatePopupPosition.js';
import ConfirmationPrompt, {BUTTON_ORDER} from '../confirmation-prompt/confirmation-prompt.jsx';
import styles from './delete-confirmation-prompt.css';
import deleteIcon from './icon--delete.svg';
import undoIcon from './icon--undo.svg';
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
    confirmDeletionHeading: {
        defaultMessage: 'Confirm Asset Deletion',
        description: 'Heading of confirmation prompt to delete asset',
        id: 'gui.gui.deleteAssetHeading'
    }
});

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

const layoutConfig = {
    modalWidth: 290,
    spaceForArrow: 30,
    counterOffset: 0,
    arrowOffsetFromBottom: 2,
    arrowHeight: 14,
    arrowWidth: 25
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
        <ConfirmationPrompt
            isOpen
            title={intl.formatMessage(messages.confirmDeletionHeading)}
            message={<FormattedMessage {...getMessage(entityType)} />}
            relativeElementRef={relativeElementRef}
            side={side}
            align={PopupAlign.CENTER}
            layoutConfig={layoutConfig}
            buttonOrder={BUTTON_ORDER.CONFIRM_FIRST}
            containerClassName={styles.body}
            messageClassName={styles.label}
            confirmButtonConfig={{
                icon: deleteIcon,
                className: styles.buttonRowButton,
                onClick: onOk
            }}
            cancelButtonConfig={{
                icon: undoIcon,
                className: styles.buttonRowButton,
                onClick: onCancel
            }}
        />
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
