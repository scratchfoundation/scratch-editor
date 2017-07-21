import PropTypes from 'prop-types';
import React from 'react';
import paper from 'paper';
import ToolTypes from '../tools/tool-types.js';

class PaperCanvas extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
        };
    }
    componentDidMount () {
        paper.setup('paper-canvas');
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
    componentWillReceiveProps (nextProps) {
        if (nextProps.tool !== this.props.tool && nextProps.tool instanceof ToolTypes) {
            // TODO switch tool
        }
    }
    componentWillUnmount () {
    }
    render () {
        return (
            <canvas id={this.props.canvasId} />
        );
    }
}

PaperCanvas.propTypes = {
    canvasId: PropTypes.string.isRequired,
    tool: PropTypes.shape({
        name: PropTypes.string.isRequired
    })
};

module.exports = PaperCanvas;
