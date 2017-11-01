import PropTypes from 'prop-types';
import React from 'react';
import PaintEditorComponent from '../components/paint-editor/paint-editor.jsx';

import {changeMode} from '../reducers/modes';
import {undo, redo, undoSnapshot} from '../reducers/undo';
import {clearSelectedItems, setSelectedItems} from '../reducers/selected-items';
import {incrementPasteOffset, setClipboardItems} from '../reducers/clipboard';

import {getGuideLayer, getBackgroundGuideLayer} from '../helper/layer';
import {performUndo, performRedo, performSnapshot, shouldShowUndo, shouldShowRedo} from '../helper/undo';
import {bringToFront, sendBackward, sendToBack, bringForward} from '../helper/order';
import {groupSelection, ungroupSelection} from '../helper/group';
import {clearSelection, getSelectedLeafItems, getSelectedRootItems} from '../helper/selection';
import {resetZoom, zoomOnSelection} from '../helper/view';

import Modes from '../modes/modes';
import {connect} from 'react-redux';
import bindAll from 'lodash.bindall';
import paper from '@scratch/paper';

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
            'handleCopyToClipboard',
            'handlePasteFromClipboard'
        ]);
    }
    componentDidMount () {
        document.addEventListener('keydown', this.props.onKeyPress);
    }
    componentWillUnmount () {
        document.removeEventListener('keydown', this.props.onKeyPress);
    }
    handleUpdateSvg (skipSnapshot) {
        // Store the zoom/pan and restore it after snapshotting
        // TODO Only doing this because snapshotting at zoom/pan makes export wrong
        const oldZoom = paper.project.view.zoom;
        const oldCenter = paper.project.view.center.clone();
        resetZoom();
        // Hide guide layer
        const guideLayer = getGuideLayer();
        const backgroundGuideLayer = getBackgroundGuideLayer();
        guideLayer.remove();
        backgroundGuideLayer.remove();
        const bounds = paper.project.activeLayer.bounds;
        this.props.onUpdateSvg(
            paper.project.exportSVG({
                asString: true,
                matrix: new paper.Matrix().translate(-bounds.x, -bounds.y)
            }),
            paper.project.view.center.x - bounds.x,
            paper.project.view.center.y - bounds.y);
        if (!skipSnapshot) {
            performSnapshot(this.props.undoSnapshot);
        }
        paper.project.addLayer(backgroundGuideLayer);
        backgroundGuideLayer.sendToBack();
        paper.project.addLayer(guideLayer);
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
    handleCopyToClipboard () {
        const selectedItems = getSelectedRootItems();
        if (selectedItems.length > 0) {
            const clipboardItems = [];
            for (let i = 0; i < selectedItems.length; i++) {
                const jsonItem = selectedItems[i].exportJSON({asString: false});
                clipboardItems.push(jsonItem);
            }
            this.props.setClipboardItems(clipboardItems);
        }
    }
    handlePasteFromClipboard () {
        clearSelection(this.props.clearSelectedItems);

        if (this.props.clipboardItems.length > 0) {
            for (let i = 0; i < this.props.clipboardItems.length; i++) {
                const item = paper.Base.importJSON(this.props.clipboardItems[i]);
                if (item) {
                    item.selected = true;
                }
                const placedItem = paper.project.getActiveLayer().addChild(item);
                placedItem.position.x += 10 * this.props.pasteOffset;
                placedItem.position.y += 10 * this.props.pasteOffset;
            }
            this.props.incrementPasteOffset();
            this.props.setSelectedItems();
            paper.project.view.update();
            this.handleUpdateSvg();
        }
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
    render () {
        return (
            <PaintEditorComponent
                canRedo={this.canRedo}
                canUndo={this.canUndo}
                name={this.props.name}
                rotationCenterX={this.props.rotationCenterX}
                rotationCenterY={this.props.rotationCenterY}
                svg={this.props.svg}
                svgId={this.props.svgId}
                onCopyToClipboard={this.handleCopyToClipboard}
                onGroup={this.handleGroup}
                onPasteFromClipboard={this.handlePasteFromClipboard}
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
    clearSelectedItems: PropTypes.func.isRequired,
    clipboardItems: PropTypes.arrayOf(PropTypes.array),
    incrementPasteOffset: PropTypes.func.isRequired,
    name: PropTypes.string,
    onKeyPress: PropTypes.func.isRequired,
    onRedo: PropTypes.func.isRequired,
    onUndo: PropTypes.func.isRequired,
    onUpdateName: PropTypes.func.isRequired,
    onUpdateSvg: PropTypes.func.isRequired,
    pasteOffset: PropTypes.number,
    rotationCenterX: PropTypes.number,
    rotationCenterY: PropTypes.number,
    setClipboardItems: PropTypes.func.isRequired,
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
    selectedItems: state.scratchPaint.selectedItems,
    undoState: state.scratchPaint.undo,
    clipboardItems: state.scratchPaint.clipboard.items,
    pasteOffset: state.scratchPaint.clipboard.pasteOffset
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
    setClipboardItems: items => {
        dispatch(setClipboardItems(items));
    },
    incrementPasteOffset: () => {
        dispatch(incrementPasteOffset());
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(PaintEditor);
