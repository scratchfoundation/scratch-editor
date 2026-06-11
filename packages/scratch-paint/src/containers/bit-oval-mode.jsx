import paper from '@scratch/paper';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import bindAll from 'lodash.bindall';
import Modes from '../lib/modes';
import ColorStyleProptype from '../lib/color-style-proptype';
import {MIXED} from '../helper/style-path';

import {changeFillColor, DEFAULT_COLOR} from '../reducers/fill-style';
import {changeMode} from '../reducers/modes';
import {clearSelectedItems, setSelectedItems} from '../reducers/selected-items';
import {setCursor} from '../reducers/cursor';

import {clearSelection, getSelectedLeafItems} from '../helper/selection';
import OvalTool from '../helper/bit-tools/oval-tool';
import OvalModeComponent from '../components/bit-oval-mode/bit-oval-mode.jsx';

class BitOvalMode extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'activateTool',
            'deactivateTool'
        ]);
    }
    componentDidMount () {
        if (this.props.isOvalModeActive) {
            this.activateTool(this.props);
        }
    }
    componentWillReceiveProps (nextProps) {
        if (this.tool) {
            if (nextProps.color !== this.props.color) {
                this.tool.setColor(nextProps.color);
            }
            if (nextProps.selectedItems !== this.props.selectedItems) {
                this.tool.onSelectionChanged(nextProps.selectedItems);
            }
            if (nextProps.filled !== this.props.filled) {
                this.tool.setFilled(nextProps.filled);
            }
            if (nextProps.thickness !== this.props.thickness ||
                    nextProps.zoom !== this.props.zoom) {
                this.tool.setThickness(nextProps.thickness);
            }
        }

        if (nextProps.isOvalModeActive && !this.props.isOvalModeActive) {
            this.activateTool();
        } else if (!nextProps.isOvalModeActive && this.props.isOvalModeActive) {
            this.deactivateTool();
        }
    }
    shouldComponentUpdate (nextProps) {
        return nextProps.isOvalModeActive !== this.props.isOvalModeActive;
    }
    componentWillUnmount () {
        if (this.tool) {
            this.deactivateTool();
        }
    }
    activateTool () {
        clearSelection(this.props.clearSelectedItems);
        // Force the default brush color if fill is MIXED or transparent
        const fillColorPresent = this.props.color.primary !== MIXED && this.props.color.primary !== null;
        if (!fillColorPresent) {
            this.props.onChangeFillColor(DEFAULT_COLOR);
        }
        this.tool = new OvalTool(
            this.props.setSelectedItems,
            this.props.clearSelectedItems,
            this.props.setCursor,
            this.props.onUpdateImage
        );
        this.tool.setColor(this.props.color);
        this.tool.setFilled(this.props.filled);
        this.tool.setThickness(this.props.thickness);
        this.tool.activate();
    }
    deactivateTool () {
        this.tool.deactivateTool();
        this.tool.remove();
        this.tool = null;
    }
    render () {
        return (
            <OvalModeComponent
                isSelected={this.props.isOvalModeActive}
                onMouseDown={this.props.handleMouseDown}
            />
        );
    }
}

BitOvalMode.propTypes = {
    clearSelectedItems: PropTypes.func.isRequired,
    color: ColorStyleProptype,
    filled: PropTypes.bool,
    handleMouseDown: PropTypes.func.isRequired,
    isOvalModeActive: PropTypes.bool.isRequired,
    onChangeFillColor: PropTypes.func.isRequired,
    onUpdateImage: PropTypes.func.isRequired,
    selectedItems: PropTypes.arrayOf(PropTypes.instanceOf(paper.Item)),
    setCursor: PropTypes.func.isRequired,
    setSelectedItems: PropTypes.func.isRequired,
    thickness: PropTypes.number.isRequired,
    zoom: PropTypes.number.isRequired
};

const mapStateToProps = state => ({
    color: state.scratchPaint.color.fillColor,
    filled: state.scratchPaint.fillBitmapShapes,
    isOvalModeActive: state.scratchPaint.mode === Modes.BIT_OVAL,
    selectedItems: state.scratchPaint.selectedItems,
    thickness: state.scratchPaint.bitBrushSize,
    zoom: state.scratchPaint.viewBounds.scaling.x
});
const mapDispatchToProps = dispatch => ({
    clearSelectedItems: () => {
        dispatch(clearSelectedItems());
    },
    setCursor: cursorString => {
        dispatch(setCursor(cursorString));
    },
    setSelectedItems: () => {
        dispatch(setSelectedItems(getSelectedLeafItems(), true /* bitmapMode */));
    },
    handleMouseDown: () => {
        dispatch(changeMode(Modes.BIT_OVAL));
    },
    onChangeFillColor: fillColor => {
        dispatch(changeFillColor(fillColor));
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(BitOvalMode);
