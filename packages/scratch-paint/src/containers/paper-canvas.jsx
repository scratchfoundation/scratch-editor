import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import paper from '@scratch/paper';
import Formats from '../lib/format';
import Modes from '../lib/modes';
import log from '../log/log';

import {trim} from '../helper/bitmap';
import {performSnapshot} from '../helper/undo';
import {undoSnapshot, clearUndoState} from '../reducers/undo';
import {isGroup, ungroupItems} from '../helper/group';
import {clearRaster, getRaster, setupLayers} from '../helper/layer';
import {deleteSelection, getSelectedLeafItems} from '../helper/selection';
import {clearSelectedItems, setSelectedItems} from '../reducers/selected-items';
import {pan, resetZoom, zoomOnFixedPoint} from '../helper/view';
import {ensureClockwise} from '../helper/math';
import {clearHoveredItem} from '../reducers/hover';
import {clearPasteOffset} from '../reducers/clipboard';
import {updateViewBounds} from '../reducers/view-bounds';
import {changeFormat} from '../reducers/format';

import {isVector, isBitmap} from '../lib/format';

import styles from './paper-canvas.css';

class PaperCanvas extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'convertToBitmap',
            'convertToVector',
            'setCanvas',
            'importSvg',
            'handleKeyDown',
            'handleWheel',
            'switchCostume'
        ]);
    }
    componentDidMount () {
        document.addEventListener('keydown', this.handleKeyDown);
        paper.setup(this.canvas);

        const context = this.canvas.getContext('2d');
        context.webkitImageSmoothingEnabled = false;
        context.imageSmoothingEnabled = false;

        // Don't show handles by default
        paper.settings.handleSize = 0;
        // Make layers.
        setupLayers();
        if (this.props.svg) {
            this.importSvg(this.props.svg, this.props.rotationCenterX, this.props.rotationCenterY);
        } else {
            performSnapshot(this.props.undoSnapshot, this.props.format);
        }
    }
    componentWillReceiveProps (newProps) {
        if (this.props.svgId !== newProps.svgId) {
            this.switchCostume(newProps.svg, newProps.rotationCenterX, newProps.rotationCenterY);
        } else if (isVector(this.props.format) && newProps.format === Formats.BITMAP) {
            this.convertToBitmap();
        } else if (isBitmap(this.props.format) && newProps.format === Formats.VECTOR) {
            this.convertToVector();
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
    convertToBitmap () {
        this.props.clearSelectedItems();
        const raster = paper.project.activeLayer.rasterize(72, false /* insert */);
        raster.onLoad = function () {
            const subCanvas = raster.canvas;
            getRaster().drawImage(subCanvas, raster.bounds.topLeft);
            paper.project.activeLayer.removeChildren();
            this.props.onUpdateSvg();
        }.bind(this);
    }
    convertToVector () {
        this.props.clearSelectedItems();
        const raster = trim(getRaster());
        if (raster.width === 0 || raster.height === 0) {
            raster.remove();
        } else {
            paper.project.activeLayer.addChild(raster);
        }
        clearRaster();
        this.props.onUpdateSvg();
    }
    switchCostume (svg, rotationCenterX, rotationCenterY) {
        for (const layer of paper.project.layers) {
            if (layer.data.isRasterLayer) {
                clearRaster();
            } else if (!layer.data.isBackgroundGuideLayer) {
                layer.removeChildren();
            }
        }
        this.props.clearUndo();
        this.props.clearSelectedItems();
        this.props.clearHoveredItem();
        this.props.clearPasteOffset();
        if (svg) {
            this.props.changeFormat(Formats.VECTOR_SKIP_CONVERT);
            // Store the zoom/pan and restore it after importing a new SVG
            const oldZoom = paper.project.view.zoom;
            const oldCenter = paper.project.view.center.clone();
            resetZoom();
            this.props.updateViewBounds(paper.view.matrix);
            this.importSvg(svg, rotationCenterX, rotationCenterY);
            paper.project.view.zoom = oldZoom;
            paper.project.view.center = oldCenter;
        } else {
            performSnapshot(this.props.undoSnapshot, this.props.format);
        }
    }
    importSvg (svg, rotationCenterX, rotationCenterY) {
        const paperCanvas = this;
        // Pre-process SVG to prevent parsing errors (discussion from #213)
        // 1. Remove svg: namespace on elements.
        svg = svg.split(/<\s*svg:/).join('<');
        svg = svg.split(/<\/\s*svg:/).join('</');
        // 2. Add root svg namespace if it does not exist.
        const svgAttrs = svg.match(/<svg [^>]*>/);
        if (svgAttrs && svgAttrs[0].indexOf('xmlns=') === -1) {
            svg = svg.replace(
                '<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
        }

        // Get the origin which the viewBox is defined relative to. During import, Paper will translate
        // the viewBox to start at (0, 0), and we need to translate it back for some costumes to render
        // correctly.
        const parser = new DOMParser();
        const svgDom = parser.parseFromString(svg, 'text/xml');
        const viewBox = svgDom.documentElement.attributes.viewBox ?
            svgDom.documentElement.attributes.viewBox.value.match(/\S+/g) : null;
        if (viewBox) {
            for (let i = 0; i < viewBox.length; i++) {
                viewBox[i] = parseFloat(viewBox[i]);
            }
        }

        paper.project.importSVG(svg, {
            expandShapes: true,
            onLoad: function (item) {
                if (!item) {
                    log.error('SVG import failed:');
                    log.info(svg);
                    performSnapshot(paperCanvas.props.undoSnapshot, paperCanvas.props.format);
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

                ensureClockwise(item);

                if (typeof rotationCenterX !== 'undefined' && typeof rotationCenterY !== 'undefined') {
                    let rotationPoint = new paper.Point(rotationCenterX, rotationCenterY);
                    if (viewBox && viewBox.length >= 2 && !isNaN(viewBox[0]) && !isNaN(viewBox[1])) {
                        rotationPoint = rotationPoint.subtract(viewBox[0], viewBox[1]);
                    }
                    item.translate(paper.project.view.center
                        .subtract(rotationPoint));
                } else {
                    // Center
                    item.translate(paper.project.view.center
                        .subtract(itemWidth / 2, itemHeight / 2));
                }
                if (isGroup(item)) {
                    ungroupItems([item]);
                }

                performSnapshot(paperCanvas.props.undoSnapshot, paperCanvas.props.format);
            }
        });
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
            this.props.updateViewBounds(paper.view.matrix);
            this.props.setSelectedItems();
        } else if (event.shiftKey && event.deltaX === 0) {
            // Scroll horizontally (based on vertical scroll delta)
            // This is needed as for some browser/system combinations which do not set deltaX.
            // See #156.
            const dx = event.deltaY / paper.project.view.zoom;
            pan(dx, 0);
            this.props.updateViewBounds(paper.view.matrix);
        } else {
            const dx = event.deltaX / paper.project.view.zoom;
            const dy = event.deltaY / paper.project.view.zoom;
            pan(dx, dy);
            this.props.updateViewBounds(paper.view.matrix);
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
    changeFormat: PropTypes.func.isRequired,
    clearHoveredItem: PropTypes.func.isRequired,
    clearPasteOffset: PropTypes.func.isRequired,
    clearSelectedItems: PropTypes.func.isRequired,
    clearUndo: PropTypes.func.isRequired,
    format: PropTypes.oneOf(Object.keys(Formats)).isRequired,
    mode: PropTypes.oneOf(Object.keys(Modes)),
    onUpdateSvg: PropTypes.func.isRequired,
    rotationCenterX: PropTypes.number,
    rotationCenterY: PropTypes.number,
    setSelectedItems: PropTypes.func.isRequired,
    svg: PropTypes.string,
    svgId: PropTypes.string,
    undoSnapshot: PropTypes.func.isRequired,
    updateViewBounds: PropTypes.func.isRequired
};
const mapStateToProps = state => ({
    mode: state.scratchPaint.mode,
    format: state.scratchPaint.format
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
    },
    changeFormat: format => {
        dispatch(changeFormat(format));
    },
    updateViewBounds: matrix => {
        dispatch(updateViewBounds(matrix));
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(PaperCanvas);
