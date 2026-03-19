import React, {useRef, useCallback, useEffect} from 'react';
import debounce from 'lodash.debounce';
import PropTypes from 'prop-types';
import ReactModal from 'react-modal';
import {defineMessages, FormattedMessage} from 'react-intl';

import Box from '../box/box.jsx';

import arrowLeftIcon from './icon--arrow-left.svg';
import arrowRightIcon from './icon--arrow-right.svg';
import arrowDownIcon from './icon--arrow-down.svg';
import arrowUpIcon from './icon--arrow-up.svg';

import styles from './confirmation-prompt.css';
import calculatePopupPosition, {PopupAlign, PopupSide} from '../../lib/calculatePopupPosition.js';

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
    arrowLongSide: 29,
    arrowShortSide: 13
};

const SIDE_TO_ARROW_ICON = {
    [PopupSide.UP]: arrowDownIcon,
    [PopupSide.DOWN]: arrowUpIcon,
    [PopupSide.LEFT]: arrowRightIcon,
    [PopupSide.RIGHT]: arrowLeftIcon
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
    config
}) => {
    const {
        modalWidth,
        spaceForArrow,
        counterOffset,
        arrowLongSide,
        arrowShortSide
    } = {...defaultConfig, ...config};
    const arrowIcon = SIDE_TO_ARROW_ICON[side];

    const modalRef = useRef(null);
    const [modalPositionValues, setModalPositionValues] = React.useState({});
    const [arrowHeight, arrowWidth] = (side === PopupSide.LEFT || side === PopupSide.RIGHT) ?
        [arrowLongSide, arrowShortSide] : [arrowShortSide, arrowLongSide];

    const updatePosition = useCallback(() => {
        if (relativeElementRef.current && modalRef.current) {
            const pos = calculatePopupPosition({
                relativeElementRef,
                popupRef: modalRef,
                side,
                align,
                popupWidth: modalWidth,
                arrowLeftIcon,
                arrowRightIcon,
                arrowUpIcon,
                arrowDownIcon,
                spaceForArrow,
                counterOffset,
                arrowShortSide,
                arrowLongSide
            });
            setModalPositionValues(pos);
        }
    }, [
        relativeElementRef,
        side,
        align,
        modalWidth,
        spaceForArrow,
        counterOffset,
        arrowShortSide,
        arrowLongSide
    ]);

    useEffect(() => {
        if (!isOpen) return;

        const debouncedUpdate = debounce(updatePosition, 50, {leading: true});

        debouncedUpdate();

        window.addEventListener('resize', debouncedUpdate);
        return () => {
            window.removeEventListener('resize', debouncedUpdate);
            debouncedUpdate.cancel();
        };
    }, [isOpen, updatePosition]);

    const onModalMount = useCallback(el => {
        if (!el || !isOpen) return;
        modalRef.current = el;

        updatePosition();
    }, [isOpen, updatePosition]);

    return (
        isOpen && (
            <ReactModal
                isOpen
                onRequestClose={onCancel}
                contentLabel={title}
                style={{
                    content: {
                        top: modalPositionValues.top,
                        left: modalPositionValues.left,
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
                {arrowIcon && (
                    <img
                        src={arrowIcon}
                        alt=""
                        aria-hidden="true"
                        style={{
                            position: 'fixed',
                            top: modalPositionValues.arrowTop,
                            left: modalPositionValues.arrowLeft,
                            width: arrowWidth,
                            height: arrowHeight,
                            zIndex: 1001
                        }}
                    />
                )}
                <Box
                    className={styles.modalContainer}
                    componentRef={onModalMount}
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
        )
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
    config: PropTypes.shape({
        modalWidth: PropTypes.number,
        spaceForArrow: PropTypes.number,
        counterOffset: PropTypes.number,
        arrowLongSide: PropTypes.number,
        arrowShortSide: PropTypes.number
    })
};

export default ConfirmationPrompt;
