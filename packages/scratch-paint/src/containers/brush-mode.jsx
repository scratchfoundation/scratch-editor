import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import bindAll from 'lodash.bindall';
import Modes from '../modes/modes';
import Blobbiness from '../modes/blob';
import {changeBrushSize} from '../reducers/brush-mode';

class BrushMode extends React.Component {
    static get MODE () {
        return Modes.BRUSH;
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
        // TODO: This is temporary until a component that provides the brush size is hooked up
        this.props.canvas.addEventListener('mousewheel', this.onScroll);
        this.blob.activateTool({isEraser: false, ...this.props.brushModeState});

        // TODO Make sure a fill color is set on the brush
        // if(!pg.stylebar.getFillColor()) {
        //     pg.stylebar.setFillColor(pg.stylebar.getStrokeColor());
        //     pg.stylebar.setStrokeColor(null);
        // }

        // TODO setup floating tool options panel in the editor
        // pg.toolOptionPanel.setup(options, components, function() {});
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
            <div>Brush Mode</div>
        );
    }
}

BrushMode.propTypes = {
    brushModeState: PropTypes.shape({
        brushSize: PropTypes.number.isRequired
    }),
    canvas: PropTypes.instanceOf(Element).isRequired,
    changeBrushSize: PropTypes.func.isRequired,
    isBrushModeActive: PropTypes.bool.isRequired
};

const mapStateToProps = state => ({
    brushModeState: state.brushMode,
    isBrushModeActive: state.mode === BrushMode.MODE
});
const mapDispatchToProps = dispatch => ({
    changeBrushSize: brushSize => {
        dispatch(changeBrushSize(brushSize));
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(BrushMode);
