import paper from '@scratch/paper';
import PropTypes from 'prop-types';
import React from 'react';
import PaintEditorComponent from '../components/paint-editor/paint-editor.jsx';

import {changeMode} from '../reducers/modes';
import {undo, redo, undoSnapshot} from '../reducers/undo';
import {clearSelectedItems, setSelectedItems} from '../reducers/selected-items';
import {deactivateEyeDropper} from '../reducers/eye-dropper';

import {hideGuideLayers, showGuideLayers} from '../helper/layer';
import {performUndo, performRedo, performSnapshot, shouldShowUndo, shouldShowRedo} from '../helper/undo';
import {bringToFront, sendBackward, sendToBack, bringForward} from '../helper/order';
import {groupSelection, ungroupSelection} from '../helper/group';
import {getSelectedLeafItems} from '../helper/selection';
import {resetZoom, zoomOnSelection} from '../helper/view';
import EyeDropperTool from '../helper/tools/eye-dropper';

import Modes from '../lib/modes';
import {connect} from 'react-redux';
import bindAll from 'lodash.bindall';

class PaintEditor extends React.Component {
    static get ZOOM_INCREMENT () {
        return 0.5;
    }
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleUpdateSvg',
            'handleUndo',
            'handleRedo',
            'handleSendBackward',
            'handleSendForward',
            'handleSendToBack',
            'handleSendToFront',
            'handleGroup',
            'handleUngroup',
            'canRedo',
            'canUndo',
            'onMouseDown',
            'setCanvas',
            'startEyeDroppingLoop',
            'stopEyeDroppingLoop'
        ]);
        this.state = {
            canvas: null,
            colorInfo: null
        };
    }
    componentDidMount () {
        document.addEventListener('keydown', this.props.onKeyPress);
    }
    componentDidUpdate (prevProps) {
        if (this.props.isEyeDropping && !prevProps.isEyeDropping) {
            this.startEyeDroppingLoop();
        } else if (!this.props.isEyeDropping && prevProps.isEyeDropping) {
            this.stopEyeDroppingLoop();
        }
    }
    componentWillUnmount () {
        document.removeEventListener('keydown', this.props.onKeyPress);
        this.stopEyeDroppingLoop();
    }
    handleUpdateSvg (skipSnapshot) {
        // Store the zoom/pan and restore it after snapshotting
        // TODO Only doing this because snapshotting at zoom/pan makes export wrong
        const oldZoom = paper.project.view.zoom;
        const oldCenter = paper.project.view.center.clone();
        resetZoom();

        const guideLayers = hideGuideLayers();

        const bounds = paper.project.activeLayer.bounds;
        this.props.onUpdateSvg(
            paper.project.exportSVG({
                asString: true,
                bounds: 'content',
                matrix: new paper.Matrix().translate(-bounds.x, -bounds.y)
            }),
            paper.project.view.center.x - bounds.x,
            paper.project.view.center.y - bounds.y);

        showGuideLayers(guideLayers);

        if (!skipSnapshot) {
            performSnapshot(this.props.undoSnapshot);
        }

        // Restore old zoom
        paper.project.view.zoom = oldZoom;
        paper.project.view.center = oldCenter;
        paper.project.view.update();
    }
    handleUndo () {
        performUndo(this.props.undoState, this.props.onUndo, this.props.setSelectedItems, this.handleUpdateSvg);
    }
    handleRedo () {
        performRedo(this.props.undoState, this.props.onRedo, this.props.setSelectedItems, this.handleUpdateSvg);
    }
    handleGroup () {
        groupSelection(this.props.clearSelectedItems, this.props.setSelectedItems, this.handleUpdateSvg);
    }
    handleUngroup () {
        ungroupSelection(this.props.clearSelectedItems, this.props.setSelectedItems, this.handleUpdateSvg);
    }
    handleSendBackward () {
        sendBackward(this.handleUpdateSvg);
    }
    handleSendForward () {
        bringForward(this.handleUpdateSvg);
    }
    handleSendToBack () {
        sendToBack(this.handleUpdateSvg);
    }
    handleSendToFront () {
        bringToFront(this.handleUpdateSvg);
    }
    canUndo () {
        return shouldShowUndo(this.props.undoState);
    }
    canRedo () {
        return shouldShowRedo(this.props.undoState);
    }
    handleZoomIn () {
        zoomOnSelection(PaintEditor.ZOOM_INCREMENT);
    }
    handleZoomOut () {
        zoomOnSelection(-PaintEditor.ZOOM_INCREMENT);
    }
    handleZoomReset () {
        resetZoom();
    }
    setCanvas (canvas) {
        this.setState({canvas: canvas});
        this.canvas = canvas;
    }
    onMouseDown () {
        if (this.props.isEyeDropping) {
            const colorString = this.eyeDropper.colorString;
            const callback = this.props.changeColorToEyeDropper;

            this.eyeDropper.remove();
            if (!this.eyeDropper.hideLoupe) {
                // If not hide loupe, that means the click is inside the canvas,
                // so apply the new color
                callback(colorString);
            }
            this.props.previousTool.activate();
            this.props.onDeactivateEyeDropper();
            this.stopEyeDroppingLoop();
            this.setState({colorInfo: null});
        }
    }
    startEyeDroppingLoop () {
        this.eyeDropper = new EyeDropperTool(
            this.canvas,
            paper.project.view.bounds.width,
            paper.project.view.bounds.height,
            paper.project.view.pixelRatio,
            paper.view.zoom,
            paper.project.view.bounds.x,
            paper.project.view.bounds.y
        );
        this.eyeDropper.pickX = -1;
        this.eyeDropper.pickY = -1;
        this.eyeDropper.activate();

        // document listeners used to detect if a mouse is down outside of the
        // canvas, and should therefore stop the eye dropper
        document.addEventListener('mousedown', this.onMouseDown);
        document.addEventListener('touchstart', this.onMouseDown);
        
        this.intervalId = setInterval(() => {
            const colorInfo = this.eyeDropper.getColorInfo(
                this.eyeDropper.pickX,
                this.eyeDropper.pickY,
                this.eyeDropper.hideLoupe
            );
            if (!colorInfo) return;
            if (
                this.state.colorInfo === null ||
                this.state.colorInfo.x !== colorInfo.x ||
                this.state.colorInfo.y !== colorInfo.y
            ) {
                this.setState({
                    colorInfo: colorInfo
                });
            }
        }, 30);
    }
    stopEyeDroppingLoop () {
        clearInterval(this.intervalId);
        document.removeEventListener('mousedown', this.onMouseDown);
        document.removeEventListener('touchstart', this.onMouseDown);
    }
    render () {
        return (
            <PaintEditorComponent
                canRedo={this.canRedo}
                canUndo={this.canUndo}
                canvas={this.state.canvas}
                colorInfo={this.state.colorInfo}
                isEyeDropping={this.props.isEyeDropping}
                name={this.props.name}
                rotationCenterX={this.props.rotationCenterX}
                rotationCenterY={this.props.rotationCenterY}
                setCanvas={this.setCanvas}
                svg={this.props.svg}
                svgId={this.props.svgId}
                onGroup={this.handleGroup}
                onRedo={this.handleRedo}
                onSendBackward={this.handleSendBackward}
                onSendForward={this.handleSendForward}
                onSendToBack={this.handleSendToBack}
                onSendToFront={this.handleSendToFront}
                onUndo={this.handleUndo}
                onUngroup={this.handleUngroup}
                onUpdateName={this.props.onUpdateName}
                onUpdateSvg={this.handleUpdateSvg}
                onZoomIn={this.handleZoomIn}
                onZoomOut={this.handleZoomOut}
                onZoomReset={this.handleZoomReset}
            />
        );
    }
}

PaintEditor.propTypes = {
    changeColorToEyeDropper: PropTypes.func,
    clearSelectedItems: PropTypes.func.isRequired,
    isEyeDropping: PropTypes.bool,
    name: PropTypes.string,
    onDeactivateEyeDropper: PropTypes.func.isRequired,
    onKeyPress: PropTypes.func.isRequired,
    onRedo: PropTypes.func.isRequired,
    onUndo: PropTypes.func.isRequired,
    onUpdateName: PropTypes.func.isRequired,
    onUpdateSvg: PropTypes.func.isRequired,
    previousTool: PropTypes.shape({ // paper.Tool
        activate: PropTypes.func.isRequired,
        remove: PropTypes.func.isRequired
    }),
    rotationCenterX: PropTypes.number,
    rotationCenterY: PropTypes.number,
    setSelectedItems: PropTypes.func.isRequired,
    svg: PropTypes.string,
    svgId: PropTypes.string,
    undoSnapshot: PropTypes.func.isRequired,
    undoState: PropTypes.shape({
        stack: PropTypes.arrayOf(PropTypes.object).isRequired,
        pointer: PropTypes.number.isRequired
    })
};

const mapStateToProps = state => ({
    changeColorToEyeDropper: state.scratchPaint.color.eyeDropper.callback,
    clipboardItems: state.scratchPaint.clipboard.items,
    isEyeDropping: state.scratchPaint.color.eyeDropper.active,
    pasteOffset: state.scratchPaint.clipboard.pasteOffset,
    previousTool: state.scratchPaint.color.eyeDropper.previousTool,
    selectedItems: state.scratchPaint.selectedItems,
    undoState: state.scratchPaint.undo
});
const mapDispatchToProps = dispatch => ({
    onKeyPress: event => {
        if (event.key === 'e') {
            dispatch(changeMode(Modes.ERASER));
        } else if (event.key === 'b') {
            dispatch(changeMode(Modes.BRUSH));
        } else if (event.key === 'l') {
            dispatch(changeMode(Modes.LINE));
        } else if (event.key === 's') {
            dispatch(changeMode(Modes.SELECT));
        }
    },
    clearSelectedItems: () => {
        dispatch(clearSelectedItems());
    },
    setSelectedItems: () => {
        dispatch(setSelectedItems(getSelectedLeafItems()));
    },
    onUndo: () => {
        dispatch(undo());
    },
    onRedo: () => {
        dispatch(redo());
    },
    undoSnapshot: snapshot => {
        dispatch(undoSnapshot(snapshot));
    },
    onDeactivateEyeDropper: () => {
        // set redux values to default for eye dropper reducer
        dispatch(deactivateEyeDropper());
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(PaintEditor);
