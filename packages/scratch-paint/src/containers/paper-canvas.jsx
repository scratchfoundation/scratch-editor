import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import paper from '@scratch/paper';
import Modes from '../lib/modes';
import log from '../log/log';

import {performSnapshot} from '../helper/undo';
import {undoSnapshot, clearUndoState} from '../reducers/undo';
import {isGroup, ungroupItems} from '../helper/group';
import {setupLayers} from '../helper/layer';
import {deleteSelection, getSelectedLeafItems} from '../helper/selection';
import {clearSelectedItems, setSelectedItems} from '../reducers/selected-items';
import {pan, resetZoom, zoomOnFixedPoint} from '../helper/view';
import {clearHoveredItem} from '../reducers/hover';
import {clearPasteOffset} from '../reducers/clipboard';


import styles from './paper-canvas.css';

class PaperCanvas extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'setCanvas',
            'importSvg',
            'handleKeyDown',
            'handleWheel',
            '_ensureClockwise'
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
        this.props.clearSelectedItems();
        this.props.clearHoveredItem();
        this.props.clearPasteOffset();
        if (newProps.svg) {
            // Store the zoom/pan and restore it after importing a new SVG
            const oldZoom = paper.project.view.zoom;
            const oldCenter = paper.project.view.center.clone();
            resetZoom();
            this.importSvg(newProps.svg, newProps.rotationCenterX, newProps.rotationCenterY);
            paper.project.view.zoom = oldZoom;
            paper.project.view.center = oldCenter;
            paper.project.view.update();
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
        if (event.key === 'Delete' || event.key === 'Backspace') {
            if (deleteSelection(this.props.mode, this.props.onUpdateSvg)) {
                this.props.setSelectedItems();
            }
        }
    }
    importSvg (svg, rotationCenterX, rotationCenterY) {
        const paperCanvas = this;
        // Pre-process SVG to prevent parsing errors (discussion from #213)
        // 1. Remove newlines and tab characters, chrome will not load urls with them.
        //      https://www.chromestatus.com/feature/5735596811091968
        svg = svg.split(/[\n|\r|\t]/).join('');
        // 2. Remove svg: namespace on elements.
        svg = svg.split(/<\s*svg:/).join('<');
        svg = svg.split(/<\/\s*svg:/).join('</');
        // 3. Add root svg namespace if it does not exist.
        const svgAttrs = svg.match(/<svg [^>]*>/);
        if (svgAttrs && svgAttrs[0].indexOf('xmlns=') === -1) {
            svg = svg.replace(
                '<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
        }
        paper.project.importSVG(svg, {
            expandShapes: true,
            onLoad: function (item) {
                if (!item) {
                    log.error('SVG import failed:');
                    log.info(svg);
                    performSnapshot(paperCanvas.props.undoSnapshot);
                    return;
                }
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

                paperCanvas._ensureClockwise(item);

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
    _ensureClockwise (item) {
        if (item instanceof paper.Group) {
            for (const child of item.children) {
                this._ensureClockwise(child);
            }
        } else if (item instanceof paper.PathItem) {
            item.clockwise = true;
        }
    }
    setCanvas (canvas) {
        this.canvas = canvas;
        if (this.props.canvasRef) {
            this.props.canvasRef(canvas);
        }
    }
    handleWheel (event) {
        if (event.metaKey || event.ctrlKey) {
            // Zoom keeping mouse location fixed
            const canvasRect = this.canvas.getBoundingClientRect();
            const offsetX = event.clientX - canvasRect.left;
            const offsetY = event.clientY - canvasRect.top;
            const fixedPoint = paper.project.view.viewToProject(
                new paper.Point(offsetX, offsetY)
            );
            zoomOnFixedPoint(-event.deltaY / 100, fixedPoint);
        } else {
            const dx = event.deltaX / paper.project.view.zoom;
            const dy = event.deltaY / paper.project.view.zoom;
            pan(dx, dy);
        }
        event.preventDefault();
    }
    render () {
        return (
            <canvas
                className={styles.paperCanvas}
                height="360px"
                ref={this.setCanvas}
                width="480px"
                onWheel={this.handleWheel}
            />
        );
    }
}

PaperCanvas.propTypes = {
    canvasRef: PropTypes.func,
    clearHoveredItem: PropTypes.func.isRequired,
    clearPasteOffset: PropTypes.func.isRequired,
    clearSelectedItems: PropTypes.func.isRequired,
    clearUndo: PropTypes.func.isRequired,
    mode: PropTypes.oneOf(Object.keys(Modes)),
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
    },
    clearSelectedItems: () => {
        dispatch(clearSelectedItems());
    },
    clearHoveredItem: () => {
        dispatch(clearHoveredItem());
    },
    clearPasteOffset: () => {
        dispatch(clearPasteOffset());
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(PaperCanvas);
