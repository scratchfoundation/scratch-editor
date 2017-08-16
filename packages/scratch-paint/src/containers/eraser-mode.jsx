import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import bindAll from 'lodash.bindall';
import Modes from '../modes/modes';
import Blobbiness from '../modes/blob';
import EraserModeReducer from '../reducers/eraser-mode';

class EraserMode extends React.Component {
    static get MODE () {
        return Modes.ERASER;
    }
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
            this.blob.setOptions(nextProps.eraserModeState);
        }
    }
    shouldComponentUpdate () {
        return false; // Logic only component
    }
    activateTool () {
        this.props.canvas.addEventListener('mousewheel', this.onScroll);

        this.blob.activateTool(true /* isEraser */, this.props.eraserModeState);
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
            <div>Eraser Mode</div>
        );
    }
}

EraserMode.propTypes = {
    canvas: PropTypes.instanceOf(Element).isRequired,
    changeBrushSize: PropTypes.func.isRequired,
    eraserModeState: PropTypes.shape({
        brushSize: PropTypes.number.isRequired
    }),
    isEraserModeActive: PropTypes.bool.isRequired
};

const mapStateToProps = state => ({
    eraserModeState: state.eraserMode,
    isEraserModeActive: state.mode === EraserMode.MODE
});
const mapDispatchToProps = dispatch => ({
    changeBrushSize: brushSize => {
        dispatch(EraserModeReducer.changeBrushSize(brushSize));
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(EraserMode);
