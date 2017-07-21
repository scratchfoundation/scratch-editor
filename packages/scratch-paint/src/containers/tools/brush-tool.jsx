import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import bindAll from 'lodash.bindall';
import ToolTypes from '../../tools/tool-types.js';
import BlobTool from '../../tools/blob.js';
import BrushToolReducer from '../../reducers/brush-tool';
import paper from 'paper';

class BrushTool extends React.Component {
    static get TOOL_TYPE () {
        return ToolTypes.BRUSH;
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
        if (this.props.tool === BrushTool.TOOL_TYPE) {
            this.activateTool();
        }
    }
    componentWillReceiveProps (nextProps) {
        if (nextProps.tool === BrushTool.TOOL_TYPE && this.props.tool !== BrushTool.TOOL_TYPE) {
            this.activateTool();
        } else if (nextProps.tool !== BrushTool.TOOL_TYPE && this.props.tool === BrushTool.TOOL_TYPE) {
            this.deactivateTool();
        } else if (nextProps.tool === BrushTool.TOOL_TYPE && this.props.tool === BrushTool.TOOL_TYPE) {
            this.blob.setOptions(nextProps.brushToolState);
        }
    }
    shouldComponentUpdate () {
        return false; // Logic only component
    }
    activateTool () {
        document.getElementById(this.props.canvasId)
            .addEventListener('mousewheel', this.onScroll);

        const tool = new paper.Tool();
        this.blob.activateTool(false /* isEraser */, tool, this.props.brushToolState);

        // // Make sure a fill color is set on the brush
        // if(!pg.stylebar.getFillColor()) {
        //     pg.stylebar.setFillColor(pg.stylebar.getStrokeColor());
        //     pg.stylebar.setStrokeColor(null);
        // }

        // // setup floating tool options panel in the editor
        // pg.toolOptionPanel.setup(options, components, function() {});
        
        tool.activate();
    }
    deactivateTool () {
        document.getElementById(this.props.canvasId)
            .removeEventListener('mousewheel', this.onScroll);
        this.blob.deactivateTool();
    }
    onScroll (event) {
        if (event.deltaY < 0) {
            this.props.changeBrushSize(this.props.brushToolState.brushSize + 1);
        } else if (event.deltaY > 0 && this.props.brushToolState.brushSize > 1) {
            this.props.changeBrushSize(this.props.brushToolState.brushSize - 1);
        }
        return false;
    }
    render () {
        return (
            <div />
        );
    }
}

BrushTool.propTypes = {
    brushToolState: PropTypes.shape({
        brushSize: PropTypes.number.isRequired
    }),
    canvasId: PropTypes.string.isRequired,
    changeBrushSize: PropTypes.func.isRequired,
    tool: PropTypes.shape({
        name: PropTypes.string.isRequired
    })
};

const mapStateToProps = state => ({
    brushToolState: state.brushTool,
    tool: state.tool
});
const mapDispatchToProps = dispatch => ({
    changeBrushSize: brushSize => {
        dispatch(BrushToolReducer.changeBrushSize(brushSize));
    }
});

module.exports = connect(
    mapStateToProps,
    mapDispatchToProps
)(BrushTool);
