import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import bindAll from 'lodash.bindall';
import Modes from '../modes/modes';

import {changeMode} from '../reducers/modes';
import {clearHoveredItem, setHoveredItem} from '../reducers/hover';
import {clearSelectedItems, setSelectedItems} from '../reducers/selected-items';

import {getSelectedLeafItems} from '../helper/selection';
import PenTool from '../helper/tools/pen-tool';
import PenModeComponent from '../components/pen-mode.jsx';

class PenMode extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'activateTool',
            'deactivateTool'
        ]);
    }
    componentDidMount () {
        if (this.props.isPenModeActive) {
            this.activateTool(this.props);
        }
    }
    componentWillReceiveProps (nextProps) {
        if (this.tool && nextProps.hoveredItemId !== this.props.hoveredItemId) {
            this.tool.setPrevHoveredItemId(nextProps.hoveredItemId);
        }

        if (nextProps.isPenModeActive && !this.props.isPenModeActive) {
            this.activateTool();
        } else if (!nextProps.isPenModeActive && this.props.isPenModeActive) {
            this.deactivateTool();
        }
    }
    shouldComponentUpdate () {
        return false; // Static component, for now
    }
    activateTool () {
        this.tool = new PenTool(
            this.props.setHoveredItem,
            this.props.clearHoveredItem,
            this.props.setSelectedItems,
            this.props.clearSelectedItems,
            this.props.onUpdateSvg
        );
        this.tool.activate();
    }
    deactivateTool () {
        this.tool.deactivateTool();
        this.tool.remove();
        this.tool = null;
    }
    render () {
        return (
            <PenModeComponent onMouseDown={this.props.handleMouseDown} />
        );
    }
}

PenMode.propTypes = {
    clearHoveredItem: PropTypes.func.isRequired,
    clearSelectedItems: PropTypes.func.isRequired,
    handleMouseDown: PropTypes.func.isRequired,
    hoveredItemId: PropTypes.number,
    isPenModeActive: PropTypes.bool.isRequired,
    onUpdateSvg: PropTypes.func.isRequired,
    setHoveredItem: PropTypes.func.isRequired,
    setSelectedItems: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
    isPenModeActive: state.scratchPaint.mode === Modes.PEN,
    hoveredItemId: state.scratchPaint.hoveredItemId
});
const mapDispatchToProps = dispatch => ({
    setHoveredItem: hoveredItemId => {
        dispatch(setHoveredItem(hoveredItemId));
    },
    clearHoveredItem: () => {
        dispatch(clearHoveredItem());
    },
    clearSelectedItems: () => {
        dispatch(clearSelectedItems());
    },
    setSelectedItems: () => {
        dispatch(setSelectedItems(getSelectedLeafItems()));
    },
    handleMouseDown: () => {
        dispatch(changeMode(Modes.PEN));
    },
    deactivateTool () {
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(PenMode);
