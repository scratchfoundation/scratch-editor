import paper from '@scratch/paper';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import bindAll from 'lodash.bindall';
import Modes from '../modes/modes';
import {clearSelection} from '../helper/selection';
import {endPointHit, touching} from '../helper/snapping';
import {drawHitPoint, removeHitPoint} from '../helper/guides';
import {MIXED} from '../helper/style-path';
import {changeMode} from '../reducers/modes';
import {clearSelectedItems} from '../reducers/selected-items';

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
    shouldComponentUpdate () {
        return false; // Static component, for now
    }
    activateTool () {
        clearSelection(this.props.clearSelectedItems);
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
        if (event.event.button > 0) return; // only first mouse button

        // If you click near a point, continue that line instead of making a new line
        this.hitResult = endPointHit(event.point, LineMode.SNAP_TOLERANCE);
        if (this.hitResult) {
            this.path = this.hitResult.path;
            this.stylePath(this.path);
            if (this.hitResult.isFirst) {
                this.path.reverse();
            }
            this.path.add(this.hitResult.segment); // Add second point, which is what will move when dragged
            this.path.lastSegment.handleOut = null; // Make sure line isn't curvy
            this.path.lastSegment.handleIn = null;
        }

        // If not near other path, start a new path
        if (!this.path) {
            this.path = new paper.Path();
            this.stylePath(this.path);

            this.path.add(event.point);
            this.path.add(event.point); // Add second point, which is what will move when dragged
            paper.view.draw();
        }
    }
    stylePath (path) {
        // Make sure a visible line is drawn
        path.setStrokeColor(
            (this.props.colorState.strokeColor === MIXED || this.props.colorState.strokeColor === null) ?
                'black' : this.props.colorState.strokeColor);
        path.setStrokeWidth(
            this.props.colorState.strokeWidth === null || this.props.colorState.strokeWidth === 0 ?
                1 : this.props.colorState.strokeWidth);
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
        removeHitPoint();
        this.hitResult = endPointHit(event.point, LineMode.SNAP_TOLERANCE);
        this.drawHitPoint(this.hitResult);
    }
    onMouseDrag (event) {
        if (event.event.button > 0) return; // only first mouse button

        // If near another path's endpoint, or this path's beginpoint, clip to it to suggest
        // joining/closing the paths.
        removeHitPoint();
        this.hitResult = null;

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
        debugger;
        if (event.event.button > 0) return; // only first mouse button

        removeHitPoint();

        // If I single clicked, don't do anything
        if (this.path.segments.length < 2 ||
                (this.path.segments.length === 2 &&
                touching(this.path.firstSegment.point, event.point, LineMode.SNAP_TOLERANCE))) {
            this.path.remove();
            this.path = null;
            // TODO don't erase the line if both ends are snapped to different points
            return;
        } else if (
            // Single click on an existing path end point
            touching(
                this.path.lastSegment.point,
                this.path.segments[this.path.segments.length - 2].point,
                LineMode.SNAP_TOLERANCE)) {
            this.path.removeSegment(this.path.segments.length - 1);
            this.path = null;
            return;
        }
        
        // If I intersect other line end points, join or close
        if (this.hitResult) {
            this.path.removeSegment(this.path.segments.length - 1);
            if (this.path.firstSegment === this.hitResult.segment) {
                // close path
                this.path.closed = true;
            } else {
                debugger;
                // joining two paths
                if (!this.hitResult.isFirst) {
                    this.hitResult.path.reverse();
                }
                this.path.join(this.hitResult.path);
            }
            this.hitResult = null;
        }
        
        if (this.path) {
            this.props.onUpdateSvg();
            this.path = null;
        }
    }
    deactivateTool () {
        this.props.canvas.removeEventListener('mousewheel', this.onScroll);
        this.tool.remove();
        this.tool = null;
        removeHitPoint();
        this.hitResult = null;
        if (this.path) {
            this.path = null;
        }
    }
    render () {
        return (
            <LineModeComponent onMouseDown={this.props.handleMouseDown} />
        );
    }
}

LineMode.propTypes = {
    canvas: PropTypes.instanceOf(Element).isRequired,
    clearSelectedItems: PropTypes.func.isRequired,
    colorState: PropTypes.shape({
        fillColor: PropTypes.string,
        strokeColor: PropTypes.string,
        strokeWidth: PropTypes.number
    }).isRequired,
    handleMouseDown: PropTypes.func.isRequired,
    isLineModeActive: PropTypes.bool.isRequired,
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
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(LineMode);
