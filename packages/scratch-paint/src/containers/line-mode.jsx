import paper from 'paper';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import bindAll from 'lodash.bindall';
import Modes from '../modes/modes';
import {clearSelection, getSelectedLeafItems} from '../helper/selection';
import {MIXED} from '../helper/style-path';
import {changeMode} from '../reducers/modes';
import {changeStrokeWidth} from '../reducers/stroke-width';
import {clearSelectedItems, setSelectedItems} from '../reducers/selected-items';

import LineModeComponent from '../components/line-mode.jsx';

class LineMode extends React.Component {
    static get SNAP_TOLERANCE () {
        return 6;
    }
    constructor (props) {
        super(props);
        bindAll(this, [
            'activateTool',
            'deactivateTool',
            'onMouseDown',
            'onMouseMove',
            'onMouseDrag',
            'onMouseUp',
            'toleranceSquared',
            'findLineEnd',
            'onScroll'
        ]);
    }
    componentDidMount () {
        if (this.props.isLineModeActive) {
            this.activateTool();
        }
    }
    componentWillReceiveProps (nextProps) {
        if (nextProps.isLineModeActive && !this.props.isLineModeActive) {
            this.activateTool();
        } else if (!nextProps.isLineModeActive && this.props.isLineModeActive) {
            this.deactivateTool();
        }
    }
    shouldComponentUpdate () {
        return false; // Static component, for now
    }
    activateTool () {
        clearSelection(this.props.clearSelectedItems);
        this.props.canvas.addEventListener('mousewheel', this.onScroll);
        this.tool = new paper.Tool();
        
        this.path = null;
        this.hitResult = null;

        const lineMode = this;
        this.tool.onMouseDown = function (event) {
            if (event.event.button > 0) return; // only first mouse button
            lineMode.onMouseDown(event);
        };
        this.tool.onMouseMove = function (event) {
            lineMode.onMouseMove(event);
        };
        this.tool.onMouseDrag = function (event) {
            if (event.event.button > 0) return; // only first mouse button
            lineMode.onMouseDrag(event);
        };
        this.tool.onMouseUp = function (event) {
            if (event.event.button > 0) return; // only first mouse button
            lineMode.onMouseUp(event);
        };

        this.tool.activate();
    }
    onMouseDown (event) {
        // Deselect old path
        if (this.path) {
            this.path.setSelected(false);
            this.path = null;
        }

        // If you click near a point, continue that line instead of making a new line
        this.hitResult = this.findLineEnd(event.point);
        if (this.hitResult) {
            this.path = this.hitResult.path;
            if (this.hitResult.isFirst) {
                this.path.reverse();
            }
            this.path.lastSegment.setSelected(true);
            this.path.add(this.hitResult.segment); // Add second point, which is what will move when dragged
            this.path.lastSegment.handleOut = null; // Make sure line isn't curvy
            this.path.lastSegment.handleIn = null;
        }

        // If not near other path, start a new path
        if (!this.path) {
            this.path = new paper.Path();
            
            this.path.setStrokeColor(
                this.props.colorState.strokeColor === MIXED ? 'black' : this.props.colorState.strokeColor);
            // Make sure a visible line is drawn
            this.path.setStrokeWidth(
                this.props.colorState.strokeWidth === null || this.props.colorState.strokeWidth === 0 ?
                    1 : this.props.colorState.strokeWidth);

            this.path.setSelected(true);
            this.path.add(event.point);
            this.path.add(event.point); // Add second point, which is what will move when dragged
            paper.view.draw();
        }
    }
    onMouseMove (event) {
        // If near another path's endpoint, or this path's beginpoint, clip to it to suggest
        // joining/closing the paths.
        if (this.hitResult) {
            this.hitResult.path.setSelected(false);
            this.hitResult = null;
        }

        if (this.path &&
                !this.path.closed &&
                this.path.firstSegment.point.getDistance(event.point, true) < this.toleranceSquared()) {
            this.hitResult = {
                path: this.path,
                segment: this.path.firstSegment,
                isFirst: true
            };
        } else {
            this.hitResult = this.findLineEnd(event.point);
        }

        if (this.hitResult) {
            const hitPath = this.hitResult.path;
            hitPath.setSelected(true);
            if (this.hitResult.isFirst) {
                hitPath.firstSegment.setSelected(true);
            } else {
                hitPath.lastSegment.setSelected(true);
            }
        }
    }
    onMouseDrag (event) {
        // If near another path's endpoint, or this path's beginpoint, clip to it to suggest
        // joining/closing the paths.
        if (this.hitResult && this.hitResult.path !== this.path) this.hitResult.path.setSelected(false);
        this.hitResult = null;

        if (this.path &&
                this.path.segments.length > 3 &&
                this.path.firstSegment.point.getDistance(event.point, true) < this.toleranceSquared()) {
            this.hitResult = {
                path: this.path,
                segment: this.path.firstSegment,
                isFirst: true
            };
        } else {
            this.hitResult = this.findLineEnd(event.point, this.path);
            if (this.hitResult) {
                const hitPath = this.hitResult.path;
                hitPath.setSelected(true);
                if (this.hitResult.isFirst) {
                    hitPath.firstSegment.setSelected(true);
                } else {
                    hitPath.lastSegment.setSelected(true);
                }
            }
        }

        // snapping
        if (this.path) {
            if (this.hitResult) {
                this.path.lastSegment.point = this.hitResult.segment.point;
            } else {
                this.path.lastSegment.point = event.point;
            }
        }
    }
    onMouseUp (event) {
        // If I single clicked, don't do anything
        if (this.path.segments.length < 2 ||
                (this.path.segments.length === 2 &&
                    this.path.firstSegment.point.getDistance(event.point, true) < this.toleranceSquared())) {
            this.path.remove();
            this.path = null;
            // TODO don't erase the line if both ends are snapped to different points
            return;
        } else if (
            this.path.lastSegment.point.getDistance(this.path.segments[this.path.segments.length - 2].point, true) <
                this.toleranceSquared()) {
            this.path.removeSegment(this.path.segments.length - 1);
            return;
        }
        
        // If I intersect other line end points, join or close
        if (this.hitResult) {
            this.path.removeSegment(this.path.segments.length - 1);
            if (this.path.firstSegment === this.hitResult.segment) {
                // close path
                this.path.closed = true;
                this.path.setSelected(false);
            } else {
                // joining two paths
                if (!this.hitResult.isFirst) {
                    this.hitResult.path.reverse();
                }
                this.path.join(this.hitResult.path);
            }
            this.hitResult = null;
        }
        
        this.props.setSelectedItems();
        if (this.path) {
            this.props.onUpdateSvg();
        }
    }
    toleranceSquared () {
        return Math.pow(LineMode.SNAP_TOLERANCE / paper.view.zoom, 2);
    }
    findLineEnd (point, excludePath) {
        const lines = paper.project.getItems({
            class: paper.Path
        });
        // Prefer more recent lines
        for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].closed) {
                continue;
            }
            if (excludePath && lines[i] === excludePath) {
                continue;
            }
            if (lines[i].firstSegment &&
                    lines[i].firstSegment.point.getDistance(point, true) < this.toleranceSquared()) {
                return {
                    path: lines[i],
                    segment: lines[i].firstSegment,
                    isFirst: true
                };
            }
            if (lines[i].lastSegment && lines[i].lastSegment.point.getDistance(point, true) < this.toleranceSquared()) {
                return {
                    path: lines[i],
                    segment: lines[i].lastSegment,
                    isFirst: false
                };
            }
        }
        return null;
    }
    deactivateTool () {
        this.props.canvas.removeEventListener('mousewheel', this.onScroll);
        this.tool.remove();
        this.tool = null;
        this.hitResult = null;
        if (this.path) {
            this.path.setSelected(false);
            this.path = null;
        }
    }
    onScroll (event) {
        if (event.deltaY < 0) {
            this.props.changeStrokeWidth(this.props.colorState.strokeWidth + 1);
        } else if (event.deltaY > 0 && this.props.colorState.strokeWidth > 1) {
            this.props.changeStrokeWidth(this.props.colorState.strokeWidth - 1);
        }
        return true;
    }
    render () {
        return (
            <LineModeComponent onMouseDown={this.props.handleMouseDown} />
        );
    }
}

LineMode.propTypes = {
    canvas: PropTypes.instanceOf(Element).isRequired,
    changeStrokeWidth: PropTypes.func.isRequired,
    clearSelectedItems: PropTypes.func.isRequired,
    colorState: PropTypes.shape({
        fillColor: PropTypes.string,
        strokeColor: PropTypes.string,
        strokeWidth: PropTypes.number
    }).isRequired,
    handleMouseDown: PropTypes.func.isRequired,
    isLineModeActive: PropTypes.bool.isRequired,
    onUpdateSvg: PropTypes.func.isRequired,
    setSelectedItems: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
    colorState: state.scratchPaint.color,
    isLineModeActive: state.scratchPaint.mode === Modes.LINE
});
const mapDispatchToProps = dispatch => ({
    changeStrokeWidth: strokeWidth => {
        dispatch(changeStrokeWidth(strokeWidth));
    },
    clearSelectedItems: () => {
        dispatch(clearSelectedItems());
    },
    setSelectedItems: () => {
        dispatch(setSelectedItems(getSelectedLeafItems()));
    },
    handleMouseDown: () => {
        dispatch(changeMode(Modes.LINE));
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(LineMode);
