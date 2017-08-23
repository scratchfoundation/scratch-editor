import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import paper from 'paper';

class PaperCanvas extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'setCanvas'
        ]);
    }
    componentDidMount () {
        paper.setup(this.canvas);
        // Create a Paper.js Path to draw a line into it:
        const path = new paper.Path();
        // Give the stroke a color
        path.strokeColor = 'black';
        const start = new paper.Point(100, 100);
        // Move to start and draw a line from there
        path.moveTo(start);
        // Note that the plus operator on Point objects does not work
        // in JavaScript. Instead, we need to call the add() function:
        path.lineTo(start.add([200, -50]));
        // Draw the view now:
        paper.view.draw();
    }
    componentWillUnmount () {
        paper.remove();
    }
    setCanvas (canvas) {
        this.canvas = canvas;
        if (this.props.canvasRef) {
            this.props.canvasRef(canvas);
        }
    }
    render () {
        return (
            <canvas
                ref={this.setCanvas}
            />
        );
    }
}

PaperCanvas.propTypes = {
    canvasRef: PropTypes.func
};

export default PaperCanvas;
