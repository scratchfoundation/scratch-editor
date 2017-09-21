import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import paper from 'paper';

import styles from './paper-canvas.css';

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
        // Don't show handles by default
        paper.settings.handleSize = 0;
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
                        let mask;
                        for (const child of item.children) {
                            if (child.isClipMask()) {
                                mask = child;
                                break;
                            }
                        }
                        item.clipped = false;
                        mask.remove();
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
                className={styles.paperCanvas}
                height="400px"
                ref={this.setCanvas}
                width="500px"
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
