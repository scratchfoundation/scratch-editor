import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import bindAll from 'lodash.bindall';
import Modes from '../modes/modes';
import LineModeComponent from '../components/line-mode.jsx';
import {changeMode} from '../reducers/modes';
import paper from 'paper';

class LineMode extends React.Component {
    static get SNAP_TOLERANCE () {
        return 6;
    }
    constructor (props) {
        super(props);
        bindAll(this, [
            'activateTool',
            'deactivateTool',
            'toleranceSquared',
            'findLineEnd'
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
        } else if (nextProps.isLineModeActive && this.props.isLineModeActive) {
            this.blob.setOptions(nextProps.lineModeState);
        }
    }
    shouldComponentUpdate () {
        return false; // Static component, for now
    }
    activateTool () {
        // TODO add back selection
        // pg.selection.clearSelection();
        
        this.tool = new paper.Tool();
        
        this.path = null;
        this.hitResult = null;

        // TODO add back colors
        // Make sure a stroke color is set on the line tool
        // if(!pg.stylebar.getStrokeColor()) {
        //     pg.stylebar.setStrokeColor(pg.stylebar.getFillColor());
        //     pg.stylebar.setFillColor(null);
        // }

        const lineMode = this;
        this.tool.onMouseDown = function (event) {
            if (event.event.button > 0) return;  // only first mouse button

            if (this.path) {
                this.path.setSelected(false);
                this.path = null;
            }

            // If you click near a point, continue that line instead of making a new line
            this.hitResult = lineMode.findLineEnd(event.point);
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
                
                // TODO add back style
                // this.path = pg.stylebar.applyActiveToolbarStyle(path);
                this.path.setStrokeColor('black');

                this.path.setSelected(true);
                this.path.add(event.point);
                this.path.add(event.point); // Add second point, which is what will move when dragged
                paper.view.draw();
            }
        };

        this.tool.onMouseMove = function (event) {
            // If near another path's endpoint, or this path's beginpoint, clip to it to suggest
            // joining/closing the paths.
            if (this.hitResult) {
                this.hitResult.path.setSelected(false);
                this.hitResult = null;
            }

            if (this.path && !this.path.closed && this.path.firstSegment.point.getDistance(event.point, true) < lineMode.toleranceSquared()) {
                this.hitResult = {
                    path: this.path,
                    segment: this.path.firstSegment,
                    isFirst: true
                };
            } else {
                this.hitResult = lineMode.findLineEnd(event.point);
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
        };
        
        this.tool.onMouseDrag = function (event) {
            if (event.event.button > 0) return;  // only first mouse button
            // If near another path's endpoint, or this path's beginpoint, clip to it to suggest
            // joining/closing the paths.
            if (this.hitResult && this.hitResult.path !== this.path) this.hitResult.path.setSelected(false);
            this.hitResult = null;

            if (this.path && this.path.segments.length > 3 && this.path.firstSegment.point.getDistance(event.point, true) < lineMode.toleranceSquared()) {
                this.hitResult = {
                    path: this.path,
                    segment: this.path.firstSegment,
                    isFirst: true
                };
            } else {
                this.hitResult = lineMode.findLineEnd(event.point, this.path);
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
        };
        
        
        this.tool.onMouseUp = function (event) {
            if (event.event.button > 0) return;  // only first mouse button

            // If I single clicked, don't do anything
            if (this.path.segments.length < 2 || (this.path.segments.length === 2 && this.path.firstSegment.point.getDistance(event.point, true) < lineMode.toleranceSquared())) {
                this.path.remove();
                this.path = null;
                // TODO don't erase the line if both ends are snapped to different points
                return;
            } else if (this.path.lastSegment.point.getDistance(this.path.segments[this.path.segments.length - 2].point, true) < lineMode.toleranceSquared()) {
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

            // TODO add back undo
            // if (this.path) {
            //     pg.undo.snapshot('line');
            // }
            
        };

        this.tool.activate();
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
            if (lines[i].firstSegment && lines[i].firstSegment.point.getDistance(point, true) < this.toleranceSquared()) {
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
        if (this.path) {
            this.path.setSelected(false);
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
    handleMouseDown: PropTypes.func.isRequired,
    isLineModeActive: PropTypes.bool.isRequired,
    lineModeState: PropTypes.shape({
        lineWidth: PropTypes.number.isRequired
    })
};

const mapStateToProps = state => ({
    lineModeState: state.lineMode,
    isLineModeActive: state.mode === Modes.LINE
});
const mapDispatchToProps = dispatch => ({
    handleMouseDown: () => {
        dispatch(changeMode(Modes.LINE));
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(LineMode);
