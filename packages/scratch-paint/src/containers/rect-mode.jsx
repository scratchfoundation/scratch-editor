import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import bindAll from 'lodash.bindall';
import Modes from '../modes/modes';

import {changeMode} from '../reducers/modes';
import {clearSelectedItems, setSelectedItems} from '../reducers/selected-items';

import {getSelectedLeafItems} from '../helper/selection';
import RectTool from '../helper/tools/rect-tool';
import RectModeComponent from '../components/rect-mode/rect-mode.jsx';

class RectMode extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'activateTool',
            'deactivateTool'
        ]);
    }
    componentDidMount () {
        if (this.props.isRectModeActive) {
            this.activateTool(this.props);
        }
    }
    componentWillReceiveProps (nextProps) {
        if (nextProps.isRectModeActive && !this.props.isRectModeActive) {
            this.activateTool();
        } else if (!nextProps.isRectModeActive && this.props.isRectModeActive) {
            this.deactivateTool();
        }
    }
    shouldComponentUpdate (nextProps) {
        return nextProps.isRectModeActive !== this.props.isRectModeActive;
    }
    activateTool () {
        this.tool = new RectTool(
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
            <RectModeComponent
                isSelected={this.props.isRectModeActive}
                onMouseDown={this.props.handleMouseDown}
            />
        );
    }
}

RectMode.propTypes = {
    clearSelectedItems: PropTypes.func.isRequired,
    handleMouseDown: PropTypes.func.isRequired,
    isRectModeActive: PropTypes.bool.isRequired,
    onUpdateSvg: PropTypes.func.isRequired,
    setSelectedItems: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
    isRectModeActive: state.scratchPaint.mode === Modes.RECT
});
const mapDispatchToProps = dispatch => ({
    clearSelectedItems: () => {
        dispatch(clearSelectedItems());
    },
    setSelectedItems: () => {
        dispatch(setSelectedItems(getSelectedLeafItems()));
    },
    handleMouseDown: () => {
        dispatch(changeMode(Modes.RECT));
    },
    deactivateTool () {
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(RectMode);
