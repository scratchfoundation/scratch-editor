import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import bindAll from 'lodash.bindall';
import Modes from '../lib/modes';

import {changeMode} from '../reducers/modes';
import {clearSelectedItems} from '../reducers/selected-items';
import {clearSelection} from '../helper/selection';

import BitEraserModeComponent from '../components/bit-eraser-mode/bit-eraser-mode.jsx';
import BitBrushTool from '../helper/bit-tools/brush-tool';

class BitEraserMode extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'activateTool',
            'deactivateTool'
        ]);
    }
    componentDidMount () {
        if (this.props.isBitEraserModeActive) {
            this.activateTool(this.props);
        }
    }
    componentWillReceiveProps (nextProps) {
        if (this.tool && nextProps.bitEraserSize !== this.props.bitEraserSize) {
            this.tool.setBrushSize(nextProps.bitEraserSize);
        }
        
        if (nextProps.isBitEraserModeActive && !this.props.isBitEraserModeActive) {
            this.activateTool();
        } else if (!nextProps.isBitEraserModeActive && this.props.isBitEraserModeActive) {
            this.deactivateTool();
        }
    }
    shouldComponentUpdate (nextProps) {
        return nextProps.isBitEraserModeActive !== this.props.isBitEraserModeActive;
    }
    componentWillUnmount () {
        if (this.tool) {
            this.deactivateTool();
        }
    }
    activateTool () {
        clearSelection(this.props.clearSelectedItems);
        this.tool = new BitBrushTool(
            this.props.onUpdateImage,
            true /* isEraser */
        );
        this.tool.setBrushSize(this.props.bitEraserSize);

        this.tool.activate();
    }
    deactivateTool () {
        this.tool.deactivateTool();
        this.tool.remove();
        this.tool = null;
    }
    render () {
        return (
            <BitEraserModeComponent
                isSelected={this.props.isBitEraserModeActive}
                onMouseDown={this.props.handleMouseDown}
            />
        );
    }
}

BitEraserMode.propTypes = {
    bitEraserSize: PropTypes.number.isRequired,
    clearSelectedItems: PropTypes.func.isRequired,
    handleMouseDown: PropTypes.func.isRequired,
    isBitEraserModeActive: PropTypes.bool.isRequired,
    onUpdateImage: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
    bitEraserSize: state.scratchPaint.bitEraserSize,
    isBitEraserModeActive: state.scratchPaint.mode === Modes.BIT_ERASER
});
const mapDispatchToProps = dispatch => ({
    clearSelectedItems: () => {
        dispatch(clearSelectedItems());
    },
    handleMouseDown: () => {
        dispatch(changeMode(Modes.BIT_ERASER));
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(BitEraserMode);
