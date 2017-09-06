import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import paper from 'paper';

class PaperCanvas extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'setCanvas',
            'importSvg'
        ]);
    }
    componentDidMount () {
        paper.setup(this.canvas);
        if (this.props.svg) {
            this.importSvg(this.props.svg, this.props.rotationCenterX, this.props.rotationCenterY);
        }
    }
    componentWillReceiveProps (newProps) {
        paper.project.activeLayer.removeChildren();
        this.importSvg(newProps.svg, newProps.rotationCenterX, newProps.rotationCenterY);
    }
    componentWillUnmount () {
        paper.remove();
    }
    importSvg (svg, rotationCenterX, rotationCenterY) {
        const imported = paper.project.importSVG(svg,
            {
                expandShapes: true,
                onLoad: function (item) {
                    // Remove viewbox
                    if (item.clipped) {
                        item.clipped = false;
                        // Consider removing clip mask here?
                    }
                    while (item.reduce() !== item) {
                        item = item.reduce();
                    }
                }
            });
        if (typeof rotationCenterX !== 'undefined' && typeof rotationCenterY !== 'undefined') {
            imported.position =
                paper.project.view.center
                    .add(imported.bounds.width / 2, imported.bounds.height / 2)
                    .subtract(rotationCenterX, rotationCenterY);
        } else {
            // Center
            imported.position = paper.project.view.center;
        }

        paper.project.view.update();
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
    canvasRef: PropTypes.func,
    rotationCenterX: PropTypes.number,
    rotationCenterY: PropTypes.number,
    svg: PropTypes.string
};

export default PaperCanvas;
