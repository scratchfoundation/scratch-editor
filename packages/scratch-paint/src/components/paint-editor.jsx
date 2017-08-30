import bindAll from 'lodash.bindall';
import React from 'react';
import PaperCanvas from '../containers/paper-canvas.jsx';
import BrushMode from '../containers/brush-mode.jsx';
import EraserMode from '../containers/eraser-mode.jsx';
import PropTypes from 'prop-types';
import LineMode from '../containers/line-mode.jsx';

class PaintEditorComponent extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'setCanvas'
        ]);
        this.state = {};
    }
    setCanvas (canvas) {
        this.setState({canvas: canvas});
    }
    render () {
        // Modes can't work without a canvas, so we don't render them until we have it
        if (this.state.canvas) {
            return (
                <div>
                    <PaperCanvas
                        canvasRef={this.setCanvas}
                        svg={this.props.svg}
                    />
                    <BrushMode
                        canvas={this.state.canvas}
                        onUpdateSvg={this.props.onUpdateSvg}
                    />
                    <EraserMode
                        canvas={this.state.canvas}
                        onUpdateSvg={this.props.onUpdateSvg}
                    />
                    <LineMode
                        canvas={this.state.canvas}
                        onUpdateSvg={this.props.onUpdateSvg}
                    />
                </div>
            );
        }
        return (
            <div>
                <PaperCanvas canvasRef={this.setCanvas} />
            </div>
        );
    }
}

PaintEditorComponent.propTypes = {
    onUpdateSvg: PropTypes.func.isRequired,
    svg: PropTypes.string
};

export default PaintEditorComponent;
