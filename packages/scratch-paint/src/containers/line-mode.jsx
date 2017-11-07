import paper from '@scratch/paper';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import bindAll from 'lodash.bindall';
import Modes from '../modes/modes';
import {clearSelection} from '../helper/selection';
import {endPointHit, touching} from '../helper/snapping';
import {drawHitPoint, removeHitPoint} from '../helper/guides';
import {stylePath} from '../helper/style-path';
import {changeStrokeColor} from '../reducers/stroke-color';
import {changeStrokeWidth} from '../reducers/stroke-width';
import {changeMode} from '../reducers/modes';
import {clearSelectedItems} from '../reducers/selected-items';
import {MIXED} from '../helper/style-path';

import LineModeComponent from '../components/line-mode/line-mode.jsx';

class LineMode extends React.Component {
    static get SNAP_TOLERANCE () {
        return 6;
    }
    static get DEFAULT_COLOR () {
        return '#000000';
    }
    constructor (props) {
        super(props);
        bindAll(this, [
            'activateTool',
            'deactivateTool',
            'drawHitPoint',
            'onMouseDown',
            'onMouseMove',
            'onMouseDrag',
            'onMouseUp'
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
    shouldComponentUpdate (nextProps) {
        return nextProps.isLineModeActive !== this.props.isLineModeActive;
    }
    activateTool () {
        clearSelection(this.props.clearSelectedItems);

        // Force the default line color if stroke is MIXED or transparent
        const {strokeColor} = this.props.colorState;
        if (strokeColor === MIXED || strokeColor === null) {
            this.props.onChangeStrokeColor(LineMode.DEFAULT_COLOR);
        }
        // Force a minimum stroke width
        if (!this.props.colorState.strokeWidth) {
            this.props.onChangeStrokeWidth(1);
        }
        this.tool = new paper.Tool();
        this.active = false;

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
        if (event.event.button > 0) return; // only first mouse button
        this.active = true;

        // If you click near a point, continue that line instead of making a new line
        this.hitResult = endPointHit(event.point, LineMode.SNAP_TOLERANCE);
        if (this.hitResult) {
            this.path = this.hitResult.path;
            stylePath(this.path, this.props.colorState.strokeColor, this.props.colorState.strokeWidth);
            if (this.hitResult.isFirst) {
                this.path.reverse();
            }

            this.path.lastSegment.handleOut = null; // Make sure added line isn't made curvy
            this.path.add(this.hitResult.segment.point); // Add second point, which is what will move when dragged
        }

        // If not near other path, start a new path
        if (!this.path) {
            this.path = new paper.Path();
            stylePath(this.path, this.props.colorState.strokeColor, this.props.colorState.strokeWidth);

            this.path.add(event.point);
            this.path.add(event.point); // Add second point, which is what will move when dragged
            paper.view.draw();
        }
    }
    drawHitPoint (hitResult) {
        // If near another path's endpoint, draw hit point to indicate that paths would merge
        if (hitResult) {
            const hitPath = hitResult.path;
            if (hitResult.isFirst) {
                drawHitPoint(hitPath.firstSegment.point);
            } else {
                drawHitPoint(hitPath.lastSegment.point);
            }
        }
    }
    onMouseMove (event) {
        if (this.hitResult) {
            removeHitPoint();
        }
        this.hitResult = endPointHit(event.point, LineMode.SNAP_TOLERANCE);
        this.drawHitPoint(this.hitResult);
    }
    onMouseDrag (event) {
        if (event.event.button > 0 || !this.active) return; // only first mouse button

        // If near another path's endpoint, or this path's beginpoint, clip to it to suggest
        // joining/closing the paths.
        if (this.hitResult) {
            removeHitPoint();
            this.hitResult = null;
        }

        if (this.path &&
                !this.path.closed &&
                this.path.segments.length > 3 &&
                touching(this.path.firstSegment.point, event.point, LineMode.SNAP_TOLERANCE)) {
            this.hitResult = {
                path: this.path,
                segment: this.path.firstSegment,
                isFirst: true
            };
        } else {
            this.hitResult = endPointHit(event.point, LineMode.SNAP_TOLERANCE, this.path);
        }

        // snapping
        if (this.hitResult) {
            this.drawHitPoint(this.hitResult);
            this.path.lastSegment.point = this.hitResult.segment.point;
        } else {
            this.path.lastSegment.point = event.point;
        }
    }
    onMouseUp (event) {
        if (event.event.button > 0 || !this.active) return; // only first mouse button

        // If I single clicked, don't do anything
        if (this.path.segments.length < 2 ||
                (this.path.segments.length === 2 &&
                touching(this.path.firstSegment.point, event.point, LineMode.SNAP_TOLERANCE) &&
                !this.hitResult)) { // Let lines be short if you're connecting them
            this.path.remove();
            this.path = null;
            return;
        } else if (!this.hitResult &&
                touching(this.path.lastSegment.point, this.path.segments[this.path.segments.length - 2].point,
                    LineMode.SNAP_TOLERANCE)) {
            // Single click or short drag on an existing path end point
            this.path.removeSegment(this.path.segments.length - 1);
            this.path = null;
            return;
        }
        // If I intersect other line end points, join or close
        if (this.hitResult) {
            this.path.removeSegment(this.path.segments.length - 1);
            if (this.path.firstSegment.point.equals(this.hitResult.segment.point)) {
                this.path.firstSegment.handleIn = null; // Make sure added line isn't made curvy
                // close path
                this.path.closed = true;
            } else {
                // joining two paths
                if (!this.hitResult.isFirst) {
                    this.hitResult.path.reverse();
                }
                this.hitResult.path.firstSegment.handleIn = null; // Make sure added line isn't made curvy
                this.path.join(this.hitResult.path);
            }
            removeHitPoint();
            this.hitResult = null;
        }

        if (this.path) {
            this.props.onUpdateSvg();
            this.path = null;
        }
        this.active = false;
    }
    deactivateTool () {
        this.tool.remove();
        this.tool = null;
        if (this.hitResult) {
            removeHitPoint();
            this.hitResult = null;
        }
        if (this.path) {
            this.path = null;
        }
    }
    render () {
        return (
            <LineModeComponent
                isSelected={this.props.isLineModeActive}
                onMouseDown={this.props.handleMouseDown}
            />
        );
    }
}

LineMode.propTypes = {
    clearSelectedItems: PropTypes.func.isRequired,
    colorState: PropTypes.shape({
        fillColor: PropTypes.string,
        strokeColor: PropTypes.string,
        strokeWidth: PropTypes.number
    }).isRequired,
    handleMouseDown: PropTypes.func.isRequired,
    isLineModeActive: PropTypes.bool.isRequired,
    onChangeStrokeColor: PropTypes.func.isRequired,
    onChangeStrokeWidth: PropTypes.func.isRequired,
    onUpdateSvg: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
    colorState: state.scratchPaint.color,
    isLineModeActive: state.scratchPaint.mode === Modes.LINE
});
const mapDispatchToProps = dispatch => ({
    clearSelectedItems: () => {
        dispatch(clearSelectedItems());
    },
    handleMouseDown: () => {
        dispatch(changeMode(Modes.LINE));
    },
    onChangeStrokeColor: strokeColor => {
        dispatch(changeStrokeColor(strokeColor));
    },
    onChangeStrokeWidth: strokeWidth => {
        dispatch(changeStrokeWidth(strokeWidth));
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(LineMode);
