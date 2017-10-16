import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import bindAll from 'lodash.bindall';
import Modes from '../modes/modes';
import Blobbiness from '../helper/blob-tools/blob';
import {changeBrushSize} from '../reducers/eraser-mode';
import {clearSelectedItems} from '../reducers/selected-items';
import EraserModeComponent from '../components/eraser-mode.jsx';
import {changeMode} from '../reducers/modes';

class EraserMode extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'activateTool',
            'deactivateTool',
            'onScroll'
        ]);
        this.blob = new Blobbiness(
            this.props.onUpdateSvg, this.props.clearSelectedItems);
    }
    componentDidMount () {
        if (this.props.isEraserModeActive) {
            this.activateTool();
        }
    }
    componentWillReceiveProps (nextProps) {
        if (nextProps.isEraserModeActive && !this.props.isEraserModeActive) {
            this.activateTool();
        } else if (!nextProps.isEraserModeActive && this.props.isEraserModeActive) {
            this.deactivateTool();
        } else if (nextProps.isEraserModeActive && this.props.isEraserModeActive) {
            this.blob.setOptions({
                isEraser: true,
                ...nextProps.eraserModeState
            });
        }
    }
    shouldComponentUpdate () {
        return false; // Static component, for now
    }
    activateTool () {
        this.props.canvas.addEventListener('mousewheel', this.onScroll);

        this.blob.activateTool({isEraser: true, ...this.props.eraserModeState});
    }
    deactivateTool () {
        this.props.canvas.removeEventListener('mousewheel', this.onScroll);
        this.blob.deactivateTool();
    }
    onScroll (event) {
        event.preventDefault();
        if (event.deltaY < 0) {
            this.props.changeBrushSize(this.props.eraserModeState.brushSize + 1);
        } else if (event.deltaY > 0 && this.props.eraserModeState.brushSize > 1) {
            this.props.changeBrushSize(this.props.eraserModeState.brushSize - 1);
        }
    }
    render () {
        return (
            <EraserModeComponent onMouseDown={this.props.handleMouseDown} />
        );
    }
}

EraserMode.propTypes = {
    canvas: PropTypes.instanceOf(Element).isRequired,
    changeBrushSize: PropTypes.func.isRequired,
    clearSelectedItems: PropTypes.func.isRequired,
    eraserModeState: PropTypes.shape({
        brushSize: PropTypes.number.isRequired
    }),
    handleMouseDown: PropTypes.func.isRequired,
    isEraserModeActive: PropTypes.bool.isRequired,
    onUpdateSvg: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
    eraserModeState: state.scratchPaint.eraserMode,
    isEraserModeActive: state.scratchPaint.mode === Modes.ERASER
});
const mapDispatchToProps = dispatch => ({
    clearSelectedItems: () => {
        dispatch(clearSelectedItems());
    },
    changeBrushSize: brushSize => {
        dispatch(changeBrushSize(brushSize));
    },
    handleMouseDown: () => {
        dispatch(changeMode(Modes.ERASER));
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(EraserMode);
