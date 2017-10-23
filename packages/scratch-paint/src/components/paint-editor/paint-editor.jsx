import bindAll from 'lodash.bindall';
import classNames from 'classnames';
import React from 'react';
import PropTypes from 'prop-types';

import PaperCanvas from '../../containers/paper-canvas.jsx';

import Button from '../button/button.jsx';
import ButtonGroup from '../button-group/button-group.jsx';
import BrushMode from '../../containers/brush-mode.jsx';
import EditFieldButton from './edit-field-button/edit-field-button.jsx';
import EraserMode from '../../containers/eraser-mode.jsx';
import InputGroup from '../input-group/input-group.jsx';
import LineMode from '../../containers/line-mode.jsx';
import OvalMode from '../../containers/oval-mode.jsx';
import PenMode from '../../containers/pen-mode.jsx';
import RectMode from '../../containers/rect-mode.jsx';
import ReshapeMode from '../../containers/reshape-mode.jsx';
import SelectMode from '../../containers/select-mode.jsx';

import FillColorIndicatorComponent from '../../containers/fill-color-indicator.jsx';
import StrokeColorIndicatorComponent from '../../containers/stroke-color-indicator.jsx';
import StrokeWidthIndicatorComponent from '../../containers/stroke-width-indicator.jsx';

import {defineMessages, injectIntl, intlShape} from 'react-intl';
import BufferedInputHOC from '../forms/buffered-input-hoc.jsx';
import Label from '../forms/label.jsx';
import Input from '../forms/input.jsx';

import styles from './paint-editor.css';

import groupIcon from './group.svg';
import redoIcon from './redo.svg';
import rotationPointIcon from './rotation-point.svg';
import sendBackIcon from './send-back.svg';
import sendBackwardIcon from './send-backward.svg';
import sendForwardIcon from './send-forward.svg';
import sendFrontIcon from './send-front.svg';
import undoIcon from './undo.svg';
import ungroupIcon from './ungroup.svg';

const BufferedInput = BufferedInputHOC(Input);
const messages = defineMessages({
    costume: {
        id: 'paint.paintEditor.costume',
        description: 'Label for the name of a sound',
        defaultMessage: 'Costume'
    }
});

class PaintEditorComponent extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'setCanvas'
        ]);
        this.state = {};
    }
    setCanvas (canvas) {
        this.setState({canvas: canvas});
    }
    render () {
        return (
            <div className={styles.editorContainer}>
                <div className={styles.editorContainerTop}>
                    {/* First row */}
                    <div className={styles.row}>
                        {/* Name field */}
                        <InputGroup>
                            <Label text={this.props.intl.formatMessage(messages.costume)}>
                                <BufferedInput
                                    type="text"
                                    value={this.props.name}
                                    onSubmit={this.props.onUpdateName}
                                />
                            </Label>
                        </InputGroup>

                        {/* Undo/Redo */}
                        <InputGroup>
                            <ButtonGroup>
                                <Button
                                    className={styles.buttonGroupButton}
                                    onClick={this.props.onUndo}
                                >
                                    <img
                                        alt="Undo Icon"
                                        className={styles.buttonGroupButtonIcon}
                                        src={undoIcon}
                                    />
                                </Button>
                                <Button
                                    className={styles.buttonGroupButton}
                                    onClick={this.props.onRedo}
                                >
                                    <img
                                        alt="Redo Icon"
                                        className={styles.buttonGroupButtonIcon}
                                        src={redoIcon}
                                    />
                                </Button>
                            </ButtonGroup>
                        </InputGroup>

                        {/* To be Group/Ungroup */}
                        <InputGroup className={styles.modDashedBorder}>
                            <EditFieldButton
                                imgAlt="Group Icon"
                                imgSrc={groupIcon}
                                title="Group"
                                onClick={function () {}}
                            />
                            <EditFieldButton
                                imgAlt="Ungroup Icon"
                                imgSrc={ungroupIcon}
                                title="Ungroup"
                                onClick={function () {}}
                            />
                        </InputGroup>

                        {/* To be Forward/Backward */}
                        <InputGroup className={styles.modDashedBorder}>
                            <EditFieldButton
                                imgAlt="Send Forward Icon"
                                imgSrc={sendForwardIcon}
                                title="Forward"
                                onClick={function () {}}
                            />
                            <EditFieldButton
                                imgAlt="Send Backward Icon"
                                imgSrc={sendBackwardIcon}
                                title="Backward"
                                onClick={function () {}}
                            />
                        </InputGroup>

                        {/* To be Front/back */}
                        <InputGroup>
                            <EditFieldButton
                                imgAlt="Send to Front Icon"
                                imgSrc={sendFrontIcon}
                                title="Front"
                                onClick={function () {}}
                            />
                            <EditFieldButton
                                imgAlt="Send to Back Icon"
                                imgSrc={sendBackIcon}
                                title="Back"
                                onClick={function () {}}
                            />
                        </InputGroup>

                        {/* To be rotation point */}
                        {/* <InputGroup>
                            <EditFieldButton
                                imgAlt="Rotation Point Icon"
                                imgSrc={rotationPointIcon}
                                title="Rotation Point"
                                onClick={function () {}}
                            />
                        </InputGroup> */}
                    </div>

                    {/* Second Row */}
                    <div className={styles.row}>
                        <div className={classNames(styles.row, styles.modDashedBorder)}>
                            {/* fill */}
                            <FillColorIndicatorComponent
                                onUpdateSvg={this.props.onUpdateSvg}
                            />
                            {/* stroke */}
                            <StrokeColorIndicatorComponent
                                onUpdateSvg={this.props.onUpdateSvg}
                            />
                            {/* stroke width */}
                            <StrokeWidthIndicatorComponent
                                onUpdateSvg={this.props.onUpdateSvg}
                            />
                        </div>
                        <InputGroup className={styles.modModeTools}>
                            Mode tools
                        </InputGroup>
                    </div>
                </div>

                <div className={styles.topAlignRow}>
                    {/* Modes */}
                    {this.state.canvas ? (
                        <div className={styles.modeSelector}>
                            <BrushMode
                                canvas={this.state.canvas}
                                onUpdateSvg={this.props.onUpdateSvg}
                            />
                            <EraserMode
                                canvas={this.state.canvas}
                                onUpdateSvg={this.props.onUpdateSvg}
                            />
                            <PenMode
                                canvas={this.state.canvas}
                                onUpdateSvg={this.props.onUpdateSvg}
                            />
                            <LineMode
                                canvas={this.state.canvas}
                                onUpdateSvg={this.props.onUpdateSvg}
                            />
                            <SelectMode
                                onUpdateSvg={this.props.onUpdateSvg}
                            />
                            <ReshapeMode
                                onUpdateSvg={this.props.onUpdateSvg}
                            />
                            <OvalMode
                                onUpdateSvg={this.props.onUpdateSvg}
                            />
                            <RectMode
                                onUpdateSvg={this.props.onUpdateSvg}
                            />
                        </div>
                    ) : null}

                    {/* Canvas */}
                    <div className={styles.canvasContainer}>
                        <PaperCanvas
                            canvasRef={this.setCanvas}
                            rotationCenterX={this.props.rotationCenterX}
                            rotationCenterY={this.props.rotationCenterY}
                            svg={this.props.svg}
                            svgId={this.props.svgId}
                        />
                    </div>
                </div>
            </div>
        );
    }
}

PaintEditorComponent.propTypes = {
    intl: intlShape,
    name: PropTypes.string,
    onRedo: PropTypes.func.isRequired,
    onUndo: PropTypes.func.isRequired,
    onUpdateName: PropTypes.func.isRequired,
    onUpdateSvg: PropTypes.func.isRequired,
    rotationCenterX: PropTypes.number,
    rotationCenterY: PropTypes.number,
    svg: PropTypes.string,
    svgId: PropTypes.string
};

export default injectIntl(PaintEditorComponent);
