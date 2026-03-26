import React, {useRef, useState, useCallback, useEffect} from 'react';
import PropTypes from 'prop-types';
import calculatePopupPosition, {PopupAlign, PopupSide} from '../../lib/calculatePopupPosition';

const PopupWithArrow = ({
    isOpen,
    onRequestClose,
    relativeElementRef,
    side,
    align,
    layoutConfig,
    arrowConfig,
    children
}) => {
    const popupRef = useRef(null);
    const [pos, setPos] = useState({top: 0, left: 0, arrowTop: 0, arrowLeft: 0});

    const SIDE_TO_ARROW_ICON = {
        [PopupSide.UP]: arrowConfig.arrowDownIcon,
        [PopupSide.DOWN]: arrowConfig.arrowUpIcon,
        [PopupSide.LEFT]: arrowConfig.arrowRightIcon,
        [PopupSide.RIGHT]: arrowConfig.arrowLeftIcon
    };

    const {
        popupWidth,
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
        if (!relativeElementRef?.current || !popupRef.current) return;
        const newPos = calculatePopupPosition({
            relativeElementRef,
            popupRef,
            side,
            align,
            popupWidth,
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
        popupWidth,
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

    // Update position when isOpen changes
    useEffect(() => {
        if (isOpen && popupRef.current && relativeElementRef?.current) {
            updatePosition();
        }
    }, [isOpen, relativeElementRef, updatePosition]);

    // Click outside to close
    useEffect(() => {
        if (!isOpen || !onRequestClose) return;

        const handleClickOutside = event => {
            const isOutsideTooltip = popupRef.current &&
                !popupRef.current.contains(event.target);
            
            if (isOutsideTooltip) {
                onRequestClose();
            }
        };

        // The Blockly workspace suppresses compat events like `mouseup`.
        // Listen for `pointerup` instead.
        document.addEventListener('pointerup', handleClickOutside);
        return () => {
            document.removeEventListener('pointerup', handleClickOutside);
        };
    }, [isOpen, onRequestClose]);

    const onPopupMount = useCallback(el => {
        if (!el || !isOpen) return;
        popupRef.current = el;
        updatePosition();
    }, [isOpen, updatePosition]);

    if (!isOpen) return null;

    return (
        <>
            {children({
                popupRef: onPopupMount,
                pos
            })}
            {arrowIcon && (
                <img
                    src={arrowIcon}
                    alt=""
                    aria-hidden="true"
                    style={{
                        position: 'fixed',
                        top: pos.arrowTop,
                        left: pos.arrowLeft,
                        width: rotatedArrowWidth,
                        height: rotatedArrowHeight,
                        zIndex: 1001,
                        border: 'none',
                        backgroundColor: 'transparent'
                    }}
                    
                />
            )}
        </>
    );
};

PopupWithArrow.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onRequestClose: PropTypes.func,
    relativeElementRef: PropTypes.shape({current: PropTypes.instanceOf(Element)}).isRequired,
    side: PropTypes.oneOf(Object.values(PopupSide)).isRequired,
    align: PropTypes.oneOf(Object.values(PopupAlign)),
    layoutConfig: PropTypes.shape({
        popupWidth: PropTypes.number.isRequired,
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
    children: PropTypes.func.isRequired
};

PopupWithArrow.defaultProps = {
    align: PopupAlign.CENTER,
    onRequestClose: null,
    asModal: false
};

export default PopupWithArrow;
