import PropTypes from 'prop-types';
import React from 'react';
import PaintEditorComponent from '../components/paint-editor.jsx';

import {changeMode} from '../reducers/modes';
import {undo, redo, undoSnapshot} from '../reducers/undo';

import {getGuideLayer} from '../helper/layer';
import {performUndo, performRedo, performSnapshot} from '../helper/undo';

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
            'handleRedo'
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
        guideLayer.remove();
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
        paper.project.addLayer(guideLayer);
    }
    handleUndo () {
        performUndo(this.props.undoState, this.props.onUndo, this.handleUpdateSvg);
    }
    handleRedo () {
        performRedo(this.props.undoState, this.props.onRedo, this.handleUpdateSvg);
    }
    render () {
        return (
            <PaintEditorComponent
                rotationCenterX={this.props.rotationCenterX}
                rotationCenterY={this.props.rotationCenterY}
                svg={this.props.svg}
                onRedo={this.handleRedo}
                onUndo={this.handleUndo}
                onUpdateSvg={this.handleUpdateSvg}
            />
        );
    }
}

PaintEditor.propTypes = {
    onKeyPress: PropTypes.func.isRequired,
    onRedo: PropTypes.func.isRequired,
    onUndo: PropTypes.func.isRequired,
    onUpdateSvg: PropTypes.func.isRequired,
    rotationCenterX: PropTypes.number,
    rotationCenterY: PropTypes.number,
    svg: PropTypes.string,
    undoSnapshot: PropTypes.func.isRequired,
    undoState: PropTypes.shape({
        stack: PropTypes.arrayOf(PropTypes.object).isRequired,
        pointer: PropTypes.number.isRequired
    })
};

const mapStateToProps = state => ({
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
