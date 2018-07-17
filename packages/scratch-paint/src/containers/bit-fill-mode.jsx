import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import bindAll from 'lodash.bindall';
import Modes from '../lib/modes';

import FillModeComponent from '../components/bit-fill-mode/bit-fill-mode.jsx';

import {changeFillColor, DEFAULT_COLOR} from '../reducers/fill-color';
import {changeMode} from '../reducers/modes';
import {clearSelectedItems} from '../reducers/selected-items';
import {clearGradient} from '../reducers/selection-gradient-type';
import {clearSelection} from '../helper/selection';
import FillTool from '../helper/bit-tools/fill-tool';
import {MIXED} from '../helper/style-path';

class BitFillMode extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'activateTool',
            'deactivateTool'
        ]);
    }
    componentDidMount () {
        if (this.props.isFillModeActive) {
            this.activateTool(this.props);
        }
    }
    componentWillReceiveProps (nextProps) {
        if (this.tool && nextProps.color !== this.props.color) {
            this.tool.setColor(nextProps.color);
        }

        if (nextProps.isFillModeActive && !this.props.isFillModeActive) {
            this.activateTool();
        } else if (!nextProps.isFillModeActive && this.props.isFillModeActive) {
            this.deactivateTool();
        }
    }
    shouldComponentUpdate (nextProps) {
        return nextProps.isFillModeActive !== this.props.isFillModeActive;
    }
    activateTool () {
        clearSelection(this.props.clearSelectedItems);
        this.props.clearGradient();
        // Force the default brush color if fill is MIXED or transparent
        const fillColorPresent = this.props.color !== MIXED && this.props.color !== null;
        if (!fillColorPresent) {
            this.props.onChangeFillColor(DEFAULT_COLOR);
        }
        this.tool = new FillTool(this.props.onUpdateImage);
        this.tool.setColor(this.props.color);
        this.tool.activate();
    }
    deactivateTool () {
        this.tool.deactivateTool();
        this.tool.remove();
        this.tool = null;
    }
    render () {
        return (
            <FillModeComponent
                isSelected={this.props.isFillModeActive}
                onMouseDown={this.props.handleMouseDown}
            />
        );
    }
}

BitFillMode.propTypes = {
    clearGradient: PropTypes.func.isRequired,
    clearSelectedItems: PropTypes.func.isRequired,
    color: PropTypes.string,
    handleMouseDown: PropTypes.func.isRequired,
    isFillModeActive: PropTypes.bool.isRequired,
    onChangeFillColor: PropTypes.func.isRequired,
    onUpdateImage: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
    color: state.scratchPaint.color.fillColor,
    isFillModeActive: state.scratchPaint.mode === Modes.BIT_FILL
});
const mapDispatchToProps = dispatch => ({
    clearGradient: () => {
        dispatch(clearGradient());
    },
    clearSelectedItems: () => {
        dispatch(clearSelectedItems());
    },
    handleMouseDown: () => {
        dispatch(changeMode(Modes.BIT_FILL));
    },
    onChangeFillColor: fillColor => {
        dispatch(changeFillColor(fillColor));
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(BitFillMode);
