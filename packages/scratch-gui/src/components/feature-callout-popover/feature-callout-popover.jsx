import React, {useMemo} from 'react';
import PropTypes from 'prop-types';
import styles from './feature-callout-popover.css';
import {PopupAlign, PopupSide} from '../../lib/calculatePopupPosition.js';

import arrowDownIcon from './icon--arrow-down.svg';
import arrowUpIcon from './icon--arrow-up.svg';
import arrowLeftIcon from './icon--arrow-left.svg';
import arrowRightIcon from './icon--arrow-right.svg';

import Box from '../box/box.jsx';
import ModalWithArrow from '../modal-with-arrow/modal-with-arrow.jsx';

const defaultConfig = {
    width: 336,
    spaceForArrow: 12,
    arrowOffsetFromBottom: 2,
    counterOffset: 2,
    arrowWidth: 28,
    arrowHeight: 8
};

const arrowConfig = {
    arrowDownIcon,
    arrowUpIcon,
    arrowLeftIcon,
    arrowRightIcon
};

const FeatureCalloutContent = ({title, body}) => (
    <Box
        className={styles.popover}
        tabIndex={0}
        role="tooltip"
    >
        <Box className={styles.popoverTitle}>
            {title}
        </Box>
        <Box className={styles.popoverBody}>
            {body}
        </Box>
    </Box>
);

FeatureCalloutContent.propTypes = {
    title: PropTypes.node,
    body: PropTypes.node.isRequired
};

const FeatureCalloutPopover = ({
    isOpen,
    onRequestClose,
    targetRef,
    side,
    align,
    title,
    body,
    layoutConfig
}) => {
    const {
        width: modalWidth,
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
    }), [
        modalWidth,
        spaceForArrow,
        counterOffset,
        arrowOffsetFromBottom,
        arrowHeight,
        arrowWidth
    ]);

    return (
        <ModalWithArrow
            isOpen={isOpen}
            onRequestClose={onRequestClose}
            relativeElementRef={targetRef}
            side={side}
            align={align}
            layoutConfig={memoizedLayoutConfig}
            arrowConfig={arrowConfig}
            arrowStyle={styles.arrow}
            modalOverlayStyle={styles.modalOverlay}
            modalContentStyle={styles.modalContent}
        >
            <FeatureCalloutContent
                title={title}
                body={body}
            />
        </ModalWithArrow>
    );
};

FeatureCalloutPopover.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onRequestClose: PropTypes.func,
    targetRef: PropTypes.shape({current: PropTypes.instanceOf(Element)}).isRequired,
    side: PropTypes.oneOf(Object.values(PopupSide)).isRequired,
    align: PropTypes.oneOf(Object.values(PopupAlign)),
    title: PropTypes.node,
    body: PropTypes.node.isRequired,
    layoutConfig: PropTypes.shape({
        width: PropTypes.number,
        spaceForArrow: PropTypes.number,
        arrowOffsetFromBottom: PropTypes.number,
        counterOffset: PropTypes.number,
        arrowHeight: PropTypes.number,
        arrowWidth: PropTypes.number
    })
};

export default FeatureCalloutPopover;
