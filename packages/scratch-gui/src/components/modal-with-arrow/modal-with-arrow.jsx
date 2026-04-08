import React, {useRef, useState, useCallback, useEffect} from 'react';
import PropTypes from 'prop-types';
import calculatePopupPosition, {PopupAlign, PopupSide} from '../../lib/calculatePopupPosition';
import ReactModal from 'react-modal';
import ReactDOM from 'react-dom';
import classNames from 'classnames';
import styles from './modal-with-arrow.css';

const ModalWithArrow = ({
    isOpen,
    onRequestClose,
    relativeElementRef,
    side,
    align,
    layoutConfig,
    arrowConfig,
    arrowStyle,
    modalContentStyle,
    modalOverlayStyle,
    title,
    children
}) => {
    const modalRef = useRef(null);
    const [pos, setPos] = useState({top: 0, left: 0, arrowTop: 0, arrowLeft: 0});

    const SIDE_TO_ARROW_ICON = {
        [PopupSide.UP]: arrowConfig.arrowDownIcon,
        [PopupSide.DOWN]: arrowConfig.arrowUpIcon,
        [PopupSide.LEFT]: arrowConfig.arrowRightIcon,
        [PopupSide.RIGHT]: arrowConfig.arrowLeftIcon
    };

    const {
        modalWidth,
        spaceForArrow,
        counterOffset,
        arrowOffsetFromBottom,
        arrowHeight,
        arrowWidth
    } = layoutConfig;

    const arrowIcon = SIDE_TO_ARROW_ICON[side];
    const [rotatedArrowWidth, rotatedArrowHeight] =
        (side === PopupSide.UP || side === PopupSide.DOWN) ?
            [arrowWidth, arrowHeight] : [arrowHeight, arrowWidth];

    const updatePosition = useCallback(() => {
        if (!relativeElementRef?.current || !modalRef.current) return;
        const newPos = calculatePopupPosition({
            relativeElementRef,
            popupRef: modalRef,
            side,
            align,
            popupWidth: modalWidth,
            spaceForArrow,
            counterOffset,
            arrowOffsetFromBottom,
            arrowHeight: rotatedArrowHeight,
            arrowWidth: rotatedArrowWidth
        });
        setPos(newPos);
    }, [
        relativeElementRef,
        side,
        align,
        modalWidth,
        spaceForArrow,
        counterOffset,
        arrowOffsetFromBottom,
        rotatedArrowHeight,
        rotatedArrowWidth
    ]);

    // Resize/scroll listeners
    useEffect(() => {
        if (!isOpen) return;
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isOpen, updatePosition]);

    const onPopupMount = useCallback(el => {
        if (!el || !isOpen) return;
        modalRef.current = el;
        updatePosition();
    }, [isOpen, updatePosition]);
    
    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className={styles.root}>
            <ReactModal
                isOpen
                onRequestClose={onRequestClose}
                contentLabel={title}
                className={classNames(styles.modalContent, modalContentStyle)}
                overlayClassName={classNames(styles.modalOverlay, modalOverlayStyle)}
                onAfterOpen={updatePosition}
                contentRef={onPopupMount}
                style={{
                    content: {
                        top: pos.top,
                        left: pos.left,
                        width: modalWidth
                    }
                }}
            >
                {children}
            </ReactModal>
            {arrowIcon && (
                <img
                    src={arrowIcon}
                    alt=""
                    aria-hidden="true"
                    className={classNames(styles.arrow, arrowStyle)}
                    style={{
                        top: pos.arrowTop,
                        left: pos.arrowLeft,
                        width: rotatedArrowWidth,
                        height: rotatedArrowHeight
                    }}
                />
            )}
        </div>,
        document.body
    );
};

ModalWithArrow.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onRequestClose: PropTypes.func,
    relativeElementRef: PropTypes.shape({current: PropTypes.instanceOf(Element)}).isRequired,
    side: PropTypes.oneOf(Object.values(PopupSide)).isRequired,
    align: PropTypes.oneOf(Object.values(PopupAlign)),
    layoutConfig: PropTypes.shape({
        modalWidth: PropTypes.number.isRequired,
        spaceForArrow: PropTypes.number.isRequired,
        counterOffset: PropTypes.number,
        arrowOffsetFromBottom: PropTypes.number,
        arrowHeight: PropTypes.number.isRequired,
        arrowWidth: PropTypes.number.isRequired
    }).isRequired,
    arrowConfig: PropTypes.shape({
        arrowDownIcon: PropTypes.string,
        arrowUpIcon: PropTypes.string,
        arrowLeftIcon: PropTypes.string,
        arrowRightIcon: PropTypes.string
    }).isRequired,
    children: PropTypes.node.isRequired,
    arrowStyle: PropTypes.string,
    modalContentStyle: PropTypes.string,
    modalOverlayStyle: PropTypes.string,
    title: PropTypes.string
};

ModalWithArrow.defaultProps = {
    align: PopupAlign.CENTER,
    onRequestClose: null
};

export default ModalWithArrow;
