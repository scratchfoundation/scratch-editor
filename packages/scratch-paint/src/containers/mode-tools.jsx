import paper from '@scratch/paper';
import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import bindAll from 'lodash.bindall';

import ModeToolsComponent from '../components/mode-tools/mode-tools.jsx';
import {clearSelectedItems, setSelectedItems} from '../reducers/selected-items';
import {incrementPasteOffset, setClipboardItems} from '../reducers/clipboard';
import {
    clearSelection,
    deleteSelection,
    getSelectedLeafItems,
    getSelectedRootItems,
    getAllRootItems
} from '../helper/selection';
import {HANDLE_RATIO, ensureClockwise} from '../helper/math';
import {getRaster} from '../helper/layer';
import {flipBitmapHorizontal, flipBitmapVertical} from '../helper/bitmap';
import {isBitmap} from '../lib/format';
import Formats from '../lib/format';
import Modes from '../lib/modes';

class ModeTools extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            '_getSelectedUncurvedPoints',
            '_getSelectedUnpointedPoints',
            'hasSelectedUncurvedPoints',
            'hasSelectedUnpointedPoints',
            'handleCopyToClipboard',
            'handleCurvePoints',
            'handleFlipHorizontal',
            'handleFlipVertical',
            'handleDelete',
            'handlePasteFromClipboard',
            'handlePointPoints'
        ]);
    }
    _getSelectedUncurvedPoints () {
        const items = [];
        const selectedItems = getSelectedLeafItems();
        for (const item of selectedItems) {
            if (!item.segments) continue;
            for (const seg of item.segments) {
                if (seg.selected) {
                    const prev = seg.getPrevious();
                    const next = seg.getNext();
                    const isCurved =
                        (!prev || seg.handleIn.length > 0) &&
                        (!next || seg.handleOut.length > 0) &&
                        (prev && next ? seg.handleOut.isColinear(seg.handleIn) : true);
                    if (!isCurved) items.push(seg);
                }
            }
        }
        return items;
    }
    _getSelectedUnpointedPoints () {
        const points = [];
        const selectedItems = getSelectedLeafItems();
        for (const item of selectedItems) {
            if (!item.segments) continue;
            for (const seg of item.segments) {
                if (seg.selected) {
                    if (seg.handleIn.length > 0 || seg.handleOut.length > 0) {
                        points.push(seg);
                    }
                }
            }
        }
        return points;
    }
    hasSelectedUncurvedPoints () {
        const points = this._getSelectedUncurvedPoints();
        return points.length > 0;
    }
    hasSelectedUnpointedPoints () {
        const points = this._getSelectedUnpointedPoints();
        return points.length > 0;
    }
    handleCurvePoints () {
        let changed;
        const points = this._getSelectedUncurvedPoints();
        for (const point of points) {
            const prev = point.getPrevious();
            const next = point.getNext();
            const noHandles = point.handleIn.length === 0 && point.handleOut.length === 0;
            if (!prev && !next) {
                continue;
            } else if (prev && next && noHandles) {
                // Handles are parallel to the line from prev to next
                point.handleIn = prev.point.subtract(next.point)
                    .normalize()
                    .multiply(prev.getCurve().length * HANDLE_RATIO);
            } else if (prev && !next && point.handleIn.length === 0) {
                // Point is end point
                // Direction is average of normal at the point and direction to prev point, using the
                // normal that points out from the convex side
                // Lenth is curve length * HANDLE_RATIO
                const convexity = prev.getCurve().getCurvatureAtTime(.5) < 0 ? -1 : 1;
                point.handleIn = (prev.getCurve().getNormalAtTime(1)
                    .multiply(convexity)
                    .add(prev.point.subtract(point.point).normalize()))
                    .normalize()
                    .multiply(prev.getCurve().length * HANDLE_RATIO);
            } else if (next && !prev && point.handleOut.length === 0) {
                // Point is start point
                // Direction is average of normal at the point and direction to prev point, using the
                // normal that points out from the convex side
                // Lenth is curve length * HANDLE_RATIO
                const convexity = point.getCurve().getCurvatureAtTime(.5) < 0 ? -1 : 1;
                point.handleOut = (point.getCurve().getNormalAtTime(0)
                    .multiply(convexity)
                    .add(next.point.subtract(point.point).normalize()))
                    .normalize()
                    .multiply(point.getCurve().length * HANDLE_RATIO);
            }

            // Point guaranteed to have a handle now. Make the second handle match the length and direction of first.
            // This defines a curved point.
            if (point.handleIn.length > 0 && next) {
                point.handleOut = point.handleIn.multiply(-1);
            } else if (point.handleOut.length > 0 && prev) {
                point.handleIn = point.handleOut.multiply(-1);
            }
            changed = true;
        }
        if (changed) {
            this.props.setSelectedItems(this.props.format);
            this.props.onUpdateImage();
        }
    }
    handlePointPoints () {
        let changed;
        const points = this._getSelectedUnpointedPoints();
        for (const point of points) {
            const noHandles = point.handleIn.length === 0 && point.handleOut.length === 0;
            if (!noHandles) {
                point.handleIn = null;
                point.handleOut = null;
                changed = true;
            }
        }
        if (changed) {
            this.props.setSelectedItems(this.props.format);
            this.props.onUpdateImage();
        }
    }
    _handleFlip (horizontalScale, verticalScale, selectedItems) {
        if (selectedItems.length === 0) {
            // If nothing is selected, select everything
            selectedItems = getAllRootItems();
        }
        // Record old indices
        for (const item of selectedItems) {
            item.data.index = item.index;
        }

        // Group items so that they flip as a unit
        const itemGroup = new paper.Group(selectedItems);
        // Flip
        itemGroup.scale(horizontalScale, verticalScale);
        ensureClockwise(itemGroup);

        // Remove flipped item from group and insert at old index. Must insert from bottom index up.
        for (let i = 0; i < selectedItems.length; i++) {
            itemGroup.layer.insertChild(selectedItems[i].data.index, selectedItems[i]);
            selectedItems[i].data.index = null;
        }
        itemGroup.remove();

        this.props.onUpdateImage();
    }
    handleFlipHorizontal () {
        const selectedItems = getSelectedRootItems();
        if (isBitmap(this.props.format) && selectedItems.length === 0) {
            getRaster().canvas = flipBitmapHorizontal(getRaster().canvas);
            this.props.onUpdateImage();
        } else {
            this._handleFlip(-1, 1, selectedItems);
        }
    }
    handleFlipVertical () {
        const selectedItems = getSelectedRootItems();
        if (isBitmap(this.props.format) && selectedItems.length === 0) {
            getRaster().canvas = flipBitmapVertical(getRaster().canvas);
            this.props.onUpdateImage();
        } else {
            this._handleFlip(1, -1, selectedItems);
        }
    }
    handleDelete () {
        if (deleteSelection(this.props.mode, this.props.onUpdateImage)) {
            this.props.setSelectedItems(this.props.format);
        }
    }
    handleCopyToClipboard () {
        const selectedItems = getSelectedRootItems();
        if (selectedItems.length > 0) {
            const clipboardItems = [];
            for (let i = 0; i < selectedItems.length; i++) {
                const jsonItem = selectedItems[i].exportJSON({asString: false});
                clipboardItems.push(jsonItem);
            }
            this.props.setClipboardItems(clipboardItems);
        }
    }
    handlePasteFromClipboard () {
        clearSelection(this.props.clearSelectedItems);

        if (this.props.clipboardItems.length > 0) {
            let items = [];
            for (let i = 0; i < this.props.clipboardItems.length; i++) {
                const item = paper.Base.importJSON(this.props.clipboardItems[i]);
                if (item) {
                    items.push(item);
                }
            }
            if (!items.length) return;
            // If pasting a group or non-raster to bitmap, rasterize firsts
            if (isBitmap(this.props.format) && !(items.length === 1 && items[0] instanceof paper.Raster)) {
                const group = new paper.Group(items);
                items = [group.rasterize()];
                group.remove();
            }
            for (const item of items) {
                const placedItem = paper.project.getActiveLayer().addChild(item);
                placedItem.selected = true;
                placedItem.position.x += 10 * this.props.pasteOffset;
                placedItem.position.y += 10 * this.props.pasteOffset;
            }
            this.props.incrementPasteOffset();
            this.props.setSelectedItems(this.props.format);
            this.props.onUpdateImage();
        }
    }
    render () {
        return (
            <ModeToolsComponent
                hasSelectedUncurvedPoints={this.hasSelectedUncurvedPoints()}
                hasSelectedUnpointedPoints={this.hasSelectedUnpointedPoints()}
                onCopyToClipboard={this.handleCopyToClipboard}
                onCurvePoints={this.handleCurvePoints}
                onDelete={this.handleDelete}
                onFlipHorizontal={this.handleFlipHorizontal}
                onFlipVertical={this.handleFlipVertical}
                onPasteFromClipboard={this.handlePasteFromClipboard}
                onPointPoints={this.handlePointPoints}
                onUpdateImage={this.props.onUpdateImage}
            />
        );
    }
}

ModeTools.propTypes = {
    clearSelectedItems: PropTypes.func.isRequired,
    clipboardItems: PropTypes.arrayOf(PropTypes.array),
    format: PropTypes.oneOf(Object.keys(Formats)).isRequired,
    incrementPasteOffset: PropTypes.func.isRequired,
    mode: PropTypes.oneOf(Object.keys(Modes)),
    onUpdateImage: PropTypes.func.isRequired,
    pasteOffset: PropTypes.number,
    // Listen on selected items to update hasSelectedPoints
    selectedItems:
        PropTypes.arrayOf(PropTypes.instanceOf(paper.Item)), // eslint-disable-line react/no-unused-prop-types
    setClipboardItems: PropTypes.func.isRequired,
    setSelectedItems: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
    clipboardItems: state.scratchPaint.clipboard.items,
    format: state.scratchPaint.format,
    mode: state.scratchPaint.mode,
    pasteOffset: state.scratchPaint.clipboard.pasteOffset,
    selectedItems: state.scratchPaint.selectedItems
});
const mapDispatchToProps = dispatch => ({
    setClipboardItems: items => {
        dispatch(setClipboardItems(items));
    },
    incrementPasteOffset: () => {
        dispatch(incrementPasteOffset());
    },
    clearSelectedItems: () => {
        dispatch(clearSelectedItems());
    },
    setSelectedItems: format => {
        dispatch(setSelectedItems(getSelectedLeafItems(), isBitmap(format)));
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(ModeTools);
