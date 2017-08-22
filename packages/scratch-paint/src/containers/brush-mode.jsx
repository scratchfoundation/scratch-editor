import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import bindAll from 'lodash.bindall';
import Modes from '../modes/modes';
import Blobbiness from './blob/blob';
import {changeBrushSize} from '../reducers/brush-mode';
import {changeMode} from '../reducers/modes';
import BrushModeComponent from '../components/brush-mode.jsx';

class BrushMode extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'activateTool',
            'deactivateTool',
            'onScroll'
        ]);
        this.blob = new Blobbiness();
    }
    componentDidMount () {
        if (this.props.isBrushModeActive) {
            this.activateTool(this.props);
        }
    }
    componentWillReceiveProps (nextProps) {
        if (nextProps.isBrushModeActive && !this.props.isBrushModeActive) {
            this.activateTool();
        } else if (!nextProps.isBrushModeActive && this.props.isBrushModeActive) {
            this.deactivateTool();
        } else if (nextProps.isBrushModeActive && this.props.isBrushModeActive) {
            this.blob.setOptions({isEraser: false, ...nextProps.brushModeState});
        }
    }
    shouldComponentUpdate () {
        return false; // Logic only component
    }
    activateTool () {
        // TODO: Instead of clearing selection, consider a kind of "draw inside"
        // analogous to how selection works with eraser
        // pg.selection.clearSelection();

        // TODO: This is temporary until a component that provides the brush size is hooked up
        this.props.canvas.addEventListener('mousewheel', this.onScroll);
        this.blob.activateTool({isEraser: false, ...this.props.brushModeState});
    }
    deactivateTool () {
        this.props.canvas.removeEventListener('mousewheel', this.onScroll);
        this.blob.deactivateTool();
    }
    onScroll (event) {
        if (event.deltaY < 0) {
            this.props.changeBrushSize(this.props.brushModeState.brushSize + 1);
        } else if (event.deltaY > 0 && this.props.brushModeState.brushSize > 1) {
            this.props.changeBrushSize(this.props.brushModeState.brushSize - 1);
        }
        return true;
    }
    render () {
        return (
            <BrushModeComponent onMouseDown={this.props.handleMouseDown} />
        );
    }
}

BrushMode.propTypes = {
    brushModeState: PropTypes.shape({
        brushSize: PropTypes.number.isRequired
    }),
    canvas: PropTypes.instanceOf(Element).isRequired,
    changeBrushSize: PropTypes.func.isRequired,
    handleMouseDown: PropTypes.func.isRequired,
    isBrushModeActive: PropTypes.bool.isRequired
};

const mapStateToProps = state => ({
    brushModeState: state.scratchPaint.brushMode,
    isBrushModeActive: state.scratchPaint.mode === Modes.BRUSH
});
const mapDispatchToProps = dispatch => ({
    changeBrushSize: brushSize => {
        dispatch(changeBrushSize(brushSize));
    },
    handleMouseDown: () => {
        dispatch(changeMode(Modes.BRUSH));
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(BrushMode);
