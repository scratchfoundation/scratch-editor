import PropTypes from 'prop-types';
import React from 'react';
import PaintEditorComponent from '../components/paint-editor/paint-editor.jsx';

import {changeMode} from '../reducers/modes';
import {undo, redo, undoSnapshot} from '../reducers/undo';
import {clearSelectedItems, setSelectedItems} from '../reducers/selected-items';

import {getGuideLayer, getBackgroundGuideLayer} from '../helper/layer';
import {performUndo, performRedo, performSnapshot, shouldShowUndo, shouldShowRedo} from '../helper/undo';
import {bringToFront, sendBackward, sendToBack, bringForward} from '../helper/order';
import {groupSelection, ungroupSelection} from '../helper/group';
import {getSelectedLeafItems} from '../helper/selection';

import Modes from '../modes/modes';
import {connect} from 'react-redux';
import bindAll from 'lodash.bindall';
import paper from '@scratch/paper';

class PaintEditor extends React.Component {
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
            'canUndo'
        ]);
    }
    componentDidMount () {
        document.addEventListener('keydown', this.props.onKeyPress);
    }
    componentWillUnmount () {
        document.removeEventListener('keydown', this.props.onKeyPress);
    }
    handleUpdateSvg (skipSnapshot) {
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
            />
        );
    }
}

PaintEditor.propTypes = {
    clearSelectedItems: PropTypes.func.isRequired,
    name: PropTypes.string,
    onKeyPress: PropTypes.func.isRequired,
    onRedo: PropTypes.func.isRequired,
    onUndo: PropTypes.func.isRequired,
    onUpdateName: PropTypes.func.isRequired,
    onUpdateSvg: PropTypes.func.isRequired,
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
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(PaintEditor);
