import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import bindAll from 'lodash.bindall';
import ToolTypes from '../../tools/tool-types.js';
import BlobTool from '../../tools/blob.js';
import EraserToolReducer from '../../reducers/eraser-tool';
import paper from 'paper';

class EraserTool extends React.Component {
    static get TOOL_TYPE () {
        return ToolTypes.ERASER;
    }
    constructor (props) {
        super(props);
        bindAll(this, [
            'activateTool',
            'deactivateTool',
            'onScroll'
        ]);
        this.blob = new BlobTool();
    }
    componentDidMount () {
        if (this.props.tool === EraserTool.TOOL_TYPE) {
            this.activateTool();
        }
    }
    componentWillReceiveProps (nextProps) {
        if (nextProps.tool === EraserTool.TOOL_TYPE && this.props.tool !== EraserTool.TOOL_TYPE) {
            this.activateTool();
        } else if (nextProps.tool !== EraserTool.TOOL_TYPE && this.props.tool === EraserTool.TOOL_TYPE) {
            this.deactivateTool();
        } else if (nextProps.tool === EraserTool.TOOL_TYPE && this.props.tool === EraserTool.TOOL_TYPE) {
            this.blob.setOptions(nextProps.eraserToolState);
        }
    }
    shouldComponentUpdate () {
        return false; // Logic only component
    }
    activateTool () {
        document.getElementById(this.props.canvasId)
            .addEventListener('mousewheel', this.onScroll);

        this.tool = new paper.Tool();
        this.blob.activateTool(true /* isEraser */, this.tool, this.props.eraserToolState);

        // // Make sure a fill color is set on the brush
        // if(!pg.stylebar.getFillColor()) {
        //     pg.stylebar.setFillColor(pg.stylebar.getStrokeColor());
        //     pg.stylebar.setStrokeColor(null);
        // }

        // // setup floating tool options panel in the editor
        // pg.toolOptionPanel.setup(options, components, function() {});
        // get options from local storage if presentz
        
        this.tool.activate();
    }
    deactivateTool () {
        document.getElementById(this.props.canvasId)
            .removeEventListener('mousewheel', this.onScroll);
        this.blob.deactivateTool();
        this.tool.remove();
    }
    onScroll (event) {
        if (event.deltaY < 0) {
            this.props.changeBrushSize(this.props.eraserToolState.brushSize + 1);
        } else if (event.deltaY > 0 && this.props.eraserToolState.brushSize > 1) {
            this.props.changeBrushSize(this.props.eraserToolState.brushSize - 1);
        }
        return false;
    }
    render () {
        return (
            <div />
        );
    }
}

EraserTool.propTypes = {
    canvasId: PropTypes.string.isRequired,
    changeBrushSize: PropTypes.func.isRequired,
    eraserToolState: PropTypes.shape({
        brushSize: PropTypes.number.isRequired
    }),
    tool: PropTypes.shape({
        name: PropTypes.string.isRequired
    })
};

const mapStateToProps = state => ({
    eraserToolState: state.brushTool,
    tool: state.tool
});
const mapDispatchToProps = dispatch => ({
    changeBrushSize: brushSize => {
        dispatch(EraserToolReducer.changeBrushSize(brushSize));
    }
});

module.exports = connect(
    mapStateToProps,
    mapDispatchToProps
)(EraserTool);
