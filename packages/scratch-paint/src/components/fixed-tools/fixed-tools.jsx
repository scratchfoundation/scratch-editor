import classNames from 'classnames';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import React from 'react';
import MediaQuery from 'react-responsive';

import {shouldShowGroup, shouldShowUngroup} from '../../helper/group';
import {shouldShowBringForward, shouldShowSendBackward} from '../../helper/order';

import BufferedInputHOC from '../forms/buffered-input-hoc.jsx';
import Button from '../button/button.jsx';
import ButtonGroup from '../button-group/button-group.jsx';
import Dropdown from '../dropdown/dropdown.jsx';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import Formats, {isVector} from '../../lib/format';
import Input from '../forms/input.jsx';
import InputGroup from '../input-group/input-group.jsx';
import Label from '../forms/label.jsx';
import LabeledIconButton from '../labeled-icon-button/labeled-icon-button.jsx';
import layout from '../../lib/layout-constants';
import {hideLabel} from '../../lib/hide-label';
import styles from './fixed-tools.css';

import groupIcon from './icons/group.svg';
import redoIcon from './icons/redo.svg';
import sendBackIcon from './icons/send-back.svg';
import sendBackwardIcon from './icons/send-backward.svg';
import sendForwardIcon from './icons/send-forward.svg';
import sendFrontIcon from './icons/send-front.svg';
import undoIcon from './icons/undo.svg';
import ungroupIcon from './icons/ungroup.svg';

const BufferedInput = BufferedInputHOC(Input);
const messages = defineMessages({
    costume: {
        id: 'paint.paintEditor.costume',
        description: 'Label for the name of a costume',
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
    }
});

const FixedToolsComponent = props => {
    const redoDisabled = !props.canRedo();
    const undoDisabled = !props.canUndo();

    return (
        <div className={styles.row}>
            {/* Name field */}
            <InputGroup>
                <MediaQuery minWidth={layout.fullSizeEditorMinWidth}>
                    <Label text={props.intl.formatMessage(messages.costume)}>
                        <BufferedInput
                            className={styles.costumeInput}
                            type="text"
                            value={props.name}
                            onSubmit={props.onUpdateName}
                        />
                    </Label>
                </MediaQuery>
                <MediaQuery maxWidth={layout.fullSizeEditorMinWidth - 1}>
                    <BufferedInput
                        className={styles.costumeInput}
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
                                    [styles.modNoEndBorder]: !redoDisabled
                                }
                            )
                        }
                        disabled={undoDisabled}
                        onClick={props.onUndo}
                    >
                        <img
                            alt={props.intl.formatMessage(messages.undo)}
                            className={classNames(
                                styles.buttonGroupButtonIcon,
                                styles.undoIcon
                            )}
                            draggable={false}
                            src={undoIcon}
                        />
                    </Button>
                    <Button
                        className={
                            classNames(
                                styles.buttonGroupButton,
                                {
                                    [styles.modStartBorder]: !redoDisabled
                                }
                            )
                        }
                        disabled={redoDisabled}
                        onClick={props.onRedo}
                    >
                        <img
                            alt={props.intl.formatMessage(messages.redo)}
                            className={styles.buttonGroupButtonIcon}
                            draggable={false}
                            src={redoIcon}
                        />
                    </Button>
                </ButtonGroup>
            </InputGroup>

            {/* Group/Ungroup */}
            {isVector(props.format) ?
                <InputGroup className={styles.modDashedBorder}>
                    <LabeledIconButton
                        disabled={!shouldShowGroup()}
                        hideLabel={hideLabel(props.intl.locale)}
                        imgSrc={groupIcon}
                        title={props.intl.formatMessage(messages.group)}
                        onClick={props.onGroup}
                    />
                    <LabeledIconButton
                        disabled={!shouldShowUngroup()}
                        hideLabel={hideLabel(props.intl.locale)}
                        imgSrc={ungroupIcon}
                        title={props.intl.formatMessage(messages.ungroup)}
                        onClick={props.onUngroup}
                    />
                </InputGroup> : null
            }

            {/* Forward/Backward */}
            {isVector(props.format) ?
                <InputGroup className={styles.modDashedBorder}>
                    <LabeledIconButton
                        disabled={!shouldShowBringForward()}
                        hideLabel={hideLabel(props.intl.locale)}
                        imgSrc={sendForwardIcon}
                        title={props.intl.formatMessage(messages.forward)}
                        onClick={props.onSendForward}
                    />
                    <LabeledIconButton
                        disabled={!shouldShowSendBackward()}
                        hideLabel={hideLabel(props.intl.locale)}
                        imgSrc={sendBackwardIcon}
                        title={props.intl.formatMessage(messages.backward)}
                        onClick={props.onSendBackward}
                    />
                </InputGroup> : null
            }

            {isVector(props.format) ?
                <MediaQuery minWidth={layout.fullSizeEditorMinWidth}>
                    <InputGroup className={styles.row}>
                        <LabeledIconButton
                            disabled={!shouldShowBringForward()}
                            hideLabel={hideLabel(props.intl.locale)}
                            imgSrc={sendFrontIcon}
                            title={props.intl.formatMessage(messages.front)}
                            onClick={props.onSendToFront}
                        />
                        <LabeledIconButton
                            disabled={!shouldShowSendBackward()}
                            hideLabel={hideLabel(props.intl.locale)}
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
                </MediaQuery> : null
            }
            {isVector(props.format) ?
                <MediaQuery maxWidth={layout.fullSizeEditorMinWidth - 1}>
                    <InputGroup>
                        <Dropdown
                            className={styles.modUnselect}
                            enterExitTransitionDurationMs={20}
                            popoverContent={
                                <InputGroup
                                    className={styles.modContextMenu}
                                    rtl={props.rtl}
                                >
                                    <Button
                                        className={classNames(styles.modMenuItem, {
                                            [styles.modDisabled]: !shouldShowBringForward()
                                        })}
                                        disabled={!shouldShowBringForward()}
                                        onClick={props.onSendToFront}
                                    >
                                        <img
                                            className={styles.menuItemIcon}
                                            draggable={false}
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
                                            draggable={false}
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
                                            draggable={false}
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
                </MediaQuery> : null
            }
        </div>
    );
};

FixedToolsComponent.propTypes = {
    canRedo: PropTypes.func.isRequired,
    canUndo: PropTypes.func.isRequired,
    format: PropTypes.oneOf(Object.keys(Formats)),
    intl: intlShape,
    name: PropTypes.string,
    onGroup: PropTypes.func.isRequired,
    onRedo: PropTypes.func.isRequired,
    onSendBackward: PropTypes.func.isRequired,
    onSendForward: PropTypes.func.isRequired,
    onSendToBack: PropTypes.func.isRequired,
    onSendToFront: PropTypes.func.isRequired,
    onUndo: PropTypes.func.isRequired,
    onUngroup: PropTypes.func.isRequired,
    onUpdateName: PropTypes.func.isRequired,
    rtl: PropTypes.bool.isRequired
};

const mapStateToProps = state => ({
    format: state.scratchPaint.format,
    rtl: state.scratchPaint.layout.rtl,
    selectedItems: state.scratchPaint.selectedItems,
    undoState: state.scratchPaint.undo
});

export default connect(
    mapStateToProps
)(injectIntl(FixedToolsComponent));
