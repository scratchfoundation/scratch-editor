import classNames from 'classnames';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import MediaQuery from 'react-responsive';
import React from 'react';
import paper from '@scratch/paper';
import PropTypes from 'prop-types';

import PaperCanvas from '../../containers/paper-canvas.jsx';

import {shouldShowGroup, shouldShowUngroup} from '../../helper/group';
import {shouldShowBringForward, shouldShowSendBackward} from '../../helper/order';

import Box from '../box/box.jsx';
import Button from '../button/button.jsx';
import ButtonGroup from '../button-group/button-group.jsx';
import BrushMode from '../../containers/brush-mode.jsx';
import BufferedInputHOC from '../forms/buffered-input-hoc.jsx';
import {ComingSoonTooltip} from '../coming-soon/coming-soon.jsx';
import Dropdown from '../dropdown/dropdown.jsx';
import EraserMode from '../../containers/eraser-mode.jsx';
import FillColorIndicatorComponent from '../../containers/fill-color-indicator.jsx';
import FillMode from '../../containers/fill-mode.jsx';
import Input from '../forms/input.jsx';
import InputGroup from '../input-group/input-group.jsx';
import Label from '../forms/label.jsx';
import LabeledIconButton from '../labeled-icon-button/labeled-icon-button.jsx';
import LineMode from '../../containers/line-mode.jsx';
import Loupe from '../loupe/loupe.jsx';
import ModeToolsComponent from '../mode-tools/mode-tools.jsx';
import OvalMode from '../../containers/oval-mode.jsx';
import RectMode from '../../containers/rect-mode.jsx';
import ReshapeMode from '../../containers/reshape-mode.jsx';
import SelectMode from '../../containers/select-mode.jsx';
import StrokeColorIndicatorComponent from '../../containers/stroke-color-indicator.jsx';
import StrokeWidthIndicatorComponent from '../../containers/stroke-width-indicator.jsx';
import TextModeComponent from '../text-mode/text-mode.jsx';

import layout from '../../lib/layout-constants';
import styles from './paint-editor.css';

import bitmapIcon from './icons/bitmap.svg';
import groupIcon from './icons/group.svg';
import redoIcon from './icons/redo.svg';
import sendBackIcon from './icons/send-back.svg';
import sendBackwardIcon from './icons/send-backward.svg';
import sendForwardIcon from './icons/send-forward.svg';
import sendFrontIcon from './icons/send-front.svg';
import undoIcon from './icons/undo.svg';
import ungroupIcon from './icons/ungroup.svg';
import zoomInIcon from './icons/zoom-in.svg';
import zoomOutIcon from './icons/zoom-out.svg';
import zoomResetIcon from './icons/zoom-reset.svg';

const BufferedInput = BufferedInputHOC(Input);
const messages = defineMessages({
    costume: {
        id: 'paint.paintEditor.costume',
        description: 'Label for the name of a sound',
        defaultMessage: 'Costume'
    },
    group: {
        defaultMessage: 'Group',
        description: 'Label for the button to group shapes',
        id: 'paint.paintEditor.group'
    },
    ungroup: {
        defaultMessage: 'Ungroup',
        description: 'Label for the button to ungroup shapes',
        id: 'paint.paintEditor.ungroup'
    },
    undo: {
        defaultMessage: 'Undo',
        description: 'Alt to image for the button to undo an action',
        id: 'paint.paintEditor.undo'
    },
    redo: {
        defaultMessage: 'Redo',
        description: 'Alt to image for the button to redo an action',
        id: 'paint.paintEditor.redo'
    },
    forward: {
        defaultMessage: 'Forward',
        description: 'Label for the `Send forward on canvas` button',
        id: 'paint.paintEditor.forward'
    },
    backward: {
        defaultMessage: 'Backward',
        description: 'Label for the `Send backward on canvas` button',
        id: 'paint.paintEditor.backward'
    },
    front: {
        defaultMessage: 'Front',
        description: 'Label for the `Send to front of canvas` button',
        id: 'paint.paintEditor.front'
    },
    back: {
        defaultMessage: 'Back',
        description: 'Label for the `Send to back of canvas` button',
        id: 'paint.paintEditor.back'
    },
    more: {
        defaultMessage: 'More',
        description: 'Label for dropdown to access more action buttons',
        id: 'paint.paintEditor.more'
    },
    bitmap: {
        defaultMessage: 'Convert to Bitmap',
        description: 'Label for button that converts the paint editor to bitmap mode',
        id: 'paint.paintEditor.bitmap'
    }
});

const PaintEditorComponent = props => {
    const redoDisabled = !props.canRedo();
    const undoDisabled = !props.canUndo();

    return (
        <div className={styles.editorContainer}>
            {props.canvas !== null ? ( // eslint-disable-line no-negated-condition
                <div className={styles.editorContainerTop}>
                    {/* First row */}
                    <div className={styles.row}>
                        {/* Name field */}
                        <InputGroup>
                            <MediaQuery minWidth={layout.fullSizeEditorMinWidth}>
                                <Label text={props.intl.formatMessage(messages.costume)}>
                                    <BufferedInput
                                        type="text"
                                        value={props.name}
                                        onSubmit={props.onUpdateName}
                                    />
                                </Label>
                            </MediaQuery>
                            <MediaQuery maxWidth={layout.fullSizeEditorMinWidth - 1}>
                                <BufferedInput
                                    type="text"
                                    value={props.name}
                                    onSubmit={props.onUpdateName}
                                />
                            </MediaQuery>
                        </InputGroup>

                        {/* Undo/Redo */}
                        <InputGroup>
                            <ButtonGroup>
                                <Button
                                    className={
                                        classNames(
                                            styles.buttonGroupButton,
                                            {
                                                [styles.modNoRightBorder]: !redoDisabled
                                            }
                                        )
                                    }
                                    disabled={undoDisabled}
                                    onClick={props.onUndo}
                                >
                                    <img
                                        alt={props.intl.formatMessage(messages.undo)}
                                        className={styles.buttonGroupButtonIcon}
                                        src={undoIcon}
                                    />
                                </Button>
                                <Button
                                    className={
                                        classNames(
                                            styles.buttonGroupButton,
                                            {
                                                [styles.modLeftBorder]: !redoDisabled
                                            }
                                        )
                                    }
                                    disabled={redoDisabled}
                                    onClick={props.onRedo}
                                >
                                    <img
                                        alt={props.intl.formatMessage(messages.redo)}
                                        className={styles.buttonGroupButtonIcon}
                                        src={redoIcon}
                                    />
                                </Button>
                            </ButtonGroup>
                        </InputGroup>

                        {/* Group/Ungroup */}
                        <InputGroup className={styles.modDashedBorder}>
                            <LabeledIconButton
                                disabled={!shouldShowGroup()}
                                imgSrc={groupIcon}
                                title={props.intl.formatMessage(messages.group)}
                                onClick={props.onGroup}
                            />
                            <LabeledIconButton
                                disabled={!shouldShowUngroup()}
                                imgSrc={ungroupIcon}
                                title={props.intl.formatMessage(messages.ungroup)}
                                onClick={props.onUngroup}
                            />
                        </InputGroup>

                        {/* Forward/Backward */}
                        <InputGroup className={styles.modDashedBorder}>
                            <LabeledIconButton
                                disabled={!shouldShowBringForward()}
                                imgSrc={sendForwardIcon}
                                title={props.intl.formatMessage(messages.forward)}
                                onClick={props.onSendForward}
                            />
                            <LabeledIconButton
                                disabled={!shouldShowSendBackward()}
                                imgSrc={sendBackwardIcon}
                                title={props.intl.formatMessage(messages.backward)}
                                onClick={props.onSendBackward}
                            />
                        </InputGroup>

                        <MediaQuery minWidth={layout.fullSizeEditorMinWidth}>
                            <InputGroup className={styles.row}>
                                <LabeledIconButton
                                    disabled={!shouldShowBringForward()}
                                    imgSrc={sendFrontIcon}
                                    title={props.intl.formatMessage(messages.front)}
                                    onClick={props.onSendToFront}
                                />
                                <LabeledIconButton
                                    disabled={!shouldShowSendBackward()}
                                    imgSrc={sendBackIcon}
                                    title={props.intl.formatMessage(messages.back)}
                                    onClick={props.onSendToBack}
                                />
                            </InputGroup>

                            {/* To be rotation point */}
                            {/* <InputGroup>
                                <LabeledIconButton
                                    imgAlt="Rotation Point"
                                    imgSrc={rotationPointIcon}
                                    title="Rotation Point"
                                    onClick={function () {}}
                                />
                            </InputGroup> */}
                        </MediaQuery>
                        <MediaQuery maxWidth={layout.fullSizeEditorMinWidth - 1}>
                            <InputGroup>
                                <Dropdown
                                    className={styles.modUnselect}
                                    enterExitTransitionDurationMs={0}
                                    popoverContent={
                                        <InputGroup className={styles.modContextMenu}>
                                            <Button
                                                className={classNames(styles.modMenuItem, {
                                                    [styles.modDisabled]: !shouldShowBringForward()
                                                })}
                                                disabled={!shouldShowBringForward()}
                                                onClick={props.onSendToFront}
                                            >
                                                <img
                                                    className={styles.menuItemIcon}
                                                    src={sendFrontIcon}
                                                />
                                                <span>{props.intl.formatMessage(messages.front)}</span>
                                            </Button>
                                            <Button
                                                className={classNames(styles.modMenuItem, {
                                                    [styles.modDisabled]: !shouldShowSendBackward()
                                                })}
                                                disabled={!shouldShowSendBackward()}
                                                onClick={props.onSendToBack}
                                            >
                                                <img
                                                    className={styles.menuItemIcon}
                                                    src={sendBackIcon}
                                                />
                                                <span>{props.intl.formatMessage(messages.back)}</span>
                                            </Button>

                                            {/* To be rotation point */}
                                            {/* <Button
                                                className={classNames(styles.modMenuItem, styles.modTopDivider)}
                                                onClick={function () {}}
                                            >
                                                <img
                                                    className={styles.menuItemIcon}
                                                    src={rotationPointIcon}
                                                />
                                                <span>{'Rotation Point'}</span>
                                            </Button> */}
                                        </InputGroup>
                                    }
                                    tipSize={.01}
                                >
                                    {props.intl.formatMessage(messages.more)}
                                </Dropdown>
                            </InputGroup>
                        </MediaQuery>
                    </div>

                    {/* Second Row */}
                    <div className={styles.row}>
                        <InputGroup
                            className={classNames(
                                styles.row,
                                styles.modDashedBorder,
                                styles.modLabeledIconHeight
                            )}
                        >
                            {/* fill */}
                            <FillColorIndicatorComponent
                                onUpdateSvg={props.onUpdateSvg}
                            />
                            {/* stroke */}
                            <StrokeColorIndicatorComponent
                                onUpdateSvg={props.onUpdateSvg}
                            />
                            {/* stroke width */}
                            <StrokeWidthIndicatorComponent
                                onUpdateSvg={props.onUpdateSvg}
                            />
                        </InputGroup>
                        <InputGroup className={styles.modModeTools}>
                            <ModeToolsComponent
                                onCopyToClipboard={props.onCopyToClipboard}
                                onPasteFromClipboard={props.onPasteFromClipboard}
                            />
                        </InputGroup>
                    </div>
                </div>
            ) : null}

            <div className={styles.topAlignRow}>
                {/* Modes */}
                {props.canvas !== null ? ( // eslint-disable-line no-negated-condition
                    <div className={styles.modeSelector}>
                        <SelectMode
                            onUpdateSvg={props.onUpdateSvg}
                        />
                        <ReshapeMode
                            onUpdateSvg={props.onUpdateSvg}
                        />
                        <BrushMode
                            onUpdateSvg={props.onUpdateSvg}
                        />
                        <EraserMode
                            onUpdateSvg={props.onUpdateSvg}
                        />
                        {/* Text mode will go here */}
                        <LineMode
                            onUpdateSvg={props.onUpdateSvg}
                        />
                        <FillMode
                            onUpdateSvg={props.onUpdateSvg}
                        />
                        <OvalMode
                            onUpdateSvg={props.onUpdateSvg}
                        />
                        <RectMode
                            onUpdateSvg={props.onUpdateSvg}
                        />
                        {/* text tool, coming soon */}
                        <TextModeComponent />
                    </div>
                ) : null}

                {/* Canvas */}
                <div
                    className={classNames(
                        styles.canvasContainer,
                        {[styles.withEyeDropper]: props.isEyeDropping}
                    )}
                >
                    <PaperCanvas
                        canvasRef={props.setCanvas}
                        rotationCenterX={props.rotationCenterX}
                        rotationCenterY={props.rotationCenterY}
                        svg={props.svg}
                        svgId={props.svgId}
                        onUpdateSvg={props.onUpdateSvg}
                    />
                    {props.isEyeDropping &&
                        props.colorInfo !== null &&
                        !props.colorInfo.hideLoupe ? (
                            <Box className={styles.colorPickerWrapper}>
                                <Loupe
                                    colorInfo={props.colorInfo}
                                    pixelRatio={paper.project.view.pixelRatio}
                                />
                            </Box>
                        ) : null
                    }
                    <div className={styles.canvasControls}>
                        <ComingSoonTooltip
                            className={styles.bitmapTooltip}
                            place="top"
                            tooltipId="bitmap-converter"
                        >
                            <div className={styles.bitmapButton}>
                                <img
                                    className={styles.bitmapButtonIcon}
                                    src={bitmapIcon}
                                />
                                <span>
                                    {props.intl.formatMessage(messages.bitmap)}
                                </span>
                            </div>
                        </ComingSoonTooltip>
                        {/* Zoom controls */}
                        <InputGroup className={styles.zoomControls}>
                            <ButtonGroup>
                                <Button
                                    className={styles.buttonGroupButton}
                                    onClick={props.onZoomOut}
                                >
                                    <img
                                        alt="Zoom Out"
                                        className={styles.buttonGroupButtonIcon}
                                        src={zoomOutIcon}
                                    />
                                </Button>
                                <Button
                                    className={styles.buttonGroupButton}
                                    onClick={props.onZoomReset}
                                >
                                    <img
                                        alt="Zoom Reset"
                                        className={styles.buttonGroupButtonIcon}
                                        src={zoomResetIcon}
                                    />
                                </Button>
                                <Button
                                    className={styles.buttonGroupButton}
                                    onClick={props.onZoomIn}
                                >
                                    <img
                                        alt="Zoom In"
                                        className={styles.buttonGroupButtonIcon}
                                        src={zoomInIcon}
                                    />
                                </Button>
                            </ButtonGroup>
                        </InputGroup>
                    </div>
                </div>
            </div>
        </div>
    );
};

PaintEditorComponent.propTypes = {
    canRedo: PropTypes.func.isRequired,
    canUndo: PropTypes.func.isRequired,
    canvas: PropTypes.object, // eslint-disable-line react/forbid-prop-types
    colorInfo: Loupe.propTypes.colorInfo,
    intl: intlShape,
    isEyeDropping: PropTypes.bool,
    name: PropTypes.string,
    onCopyToClipboard: PropTypes.func.isRequired,
    onGroup: PropTypes.func.isRequired,
    onPasteFromClipboard: PropTypes.func.isRequired,
    onRedo: PropTypes.func.isRequired,
    onSendBackward: PropTypes.func.isRequired,
    onSendForward: PropTypes.func.isRequired,
    onSendToBack: PropTypes.func.isRequired,
    onSendToFront: PropTypes.func.isRequired,
    onUndo: PropTypes.func.isRequired,
    onUngroup: PropTypes.func.isRequired,
    onUpdateName: PropTypes.func.isRequired,
    onUpdateSvg: PropTypes.func.isRequired,
    onZoomIn: PropTypes.func.isRequired,
    onZoomOut: PropTypes.func.isRequired,
    onZoomReset: PropTypes.func.isRequired,
    rotationCenterX: PropTypes.number,
    rotationCenterY: PropTypes.number,
    setCanvas: PropTypes.func.isRequired,
    svg: PropTypes.string,
    svgId: PropTypes.string
};

export default injectIntl(PaintEditorComponent);
