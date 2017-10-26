import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import paper from '@scratch/paper';
import Modes from '../modes/modes';

import {performSnapshot} from '../helper/undo';
import {undoSnapshot, clearUndoState} from '../reducers/undo';
import {isGroup, ungroupItems} from '../helper/group';
import {setupLayers} from '../helper/layer';
import {deleteSelection, getSelectedLeafItems} from '../helper/selection';
import {setSelectedItems} from '../reducers/selected-items';

import styles from './paper-canvas.css';

class PaperCanvas extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'setCanvas',
            'importSvg',
            'handleKeyDown'
        ]);
    }
    componentDidMount () {
        document.addEventListener('keydown', this.handleKeyDown);
        paper.setup(this.canvas);
        // Don't show handles by default
        paper.settings.handleSize = 0;
        // Make layers.
        setupLayers();
        if (this.props.svg) {
            this.importSvg(this.props.svg, this.props.rotationCenterX, this.props.rotationCenterY);
        } else {
            performSnapshot(this.props.undoSnapshot);
        }
    }
    componentWillReceiveProps (newProps) {
        if (this.props.svgId === newProps.svgId) return;
        for (const layer of paper.project.layers) {
            if (!layer.data.isBackgroundGuideLayer) {
                layer.removeChildren();
            }
        }
        this.props.clearUndo();
        if (newProps.svg) {
            this.importSvg(newProps.svg, newProps.rotationCenterX, newProps.rotationCenterY);
        }
    }
    componentWillUnmount () {
        paper.remove();
        document.removeEventListener('keydown', this.handleKeyDown);
    }
    handleKeyDown (event) {
        if (event.target instanceof HTMLInputElement) {
            // Ignore delete if a text input field is focused
            return;
        }
        // Backspace, delete
        if (event.key.toLowerCase() === 'delete' || event.key.toLowerCase() === 'backspace') {
            if (deleteSelection(this.props.mode, this.props.onUpdateSvg)) {
                this.props.setSelectedItems();
            }
        }
    }
    importSvg (svg, rotationCenterX, rotationCenterY) {
        const paperCanvas = this;
        paper.project.importSVG(svg, {
            expandShapes: true,
            onLoad: function (item) {
                const itemWidth = item.bounds.width;
                const itemHeight = item.bounds.height;

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
                }
                
                // Reduce single item nested in groups
                if (item.children && item.children.length === 1) {
                    item = item.reduce();
                }

                if (typeof rotationCenterX !== 'undefined' && typeof rotationCenterY !== 'undefined') {
                    item.position =
                        paper.project.view.center
                            .add(itemWidth / 2, itemHeight / 2)
                            .subtract(rotationCenterX, rotationCenterY);
                } else {
                    // Center
                    item.position = paper.project.view.center;
                }
                if (isGroup(item)) {
                    ungroupItems([item]);
                }

                performSnapshot(paperCanvas.props.undoSnapshot);
                paper.project.view.update();
            }
        });
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
    clearUndo: PropTypes.func.isRequired,
    mode: PropTypes.instanceOf(Modes),
    onUpdateSvg: PropTypes.func.isRequired,
    rotationCenterX: PropTypes.number,
    rotationCenterY: PropTypes.number,
    setSelectedItems: PropTypes.func.isRequired,
    svg: PropTypes.string,
    svgId: PropTypes.string,
    undoSnapshot: PropTypes.func.isRequired
};
const mapStateToProps = state => ({
    mode: state.scratchPaint.mode
});
const mapDispatchToProps = dispatch => ({
    undoSnapshot: snapshot => {
        dispatch(undoSnapshot(snapshot));
    },
    clearUndo: () => {
        dispatch(clearUndoState());
    },
    setSelectedItems: () => {
        dispatch(setSelectedItems(getSelectedLeafItems()));
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(PaperCanvas);
