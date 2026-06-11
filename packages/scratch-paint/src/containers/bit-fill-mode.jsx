import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import bindAll from 'lodash.bindall';
import Modes from '../lib/modes';
import GradientTypes from '../lib/gradient-types';

import FillModeComponent from '../components/bit-fill-mode/bit-fill-mode.jsx';

import {changeFillColor, changeFillColor2, DEFAULT_COLOR} from '../reducers/fill-style';
import {changeMode} from '../reducers/modes';
import {clearSelectedItems} from '../reducers/selected-items';
import {changeGradientType} from '../reducers/fill-mode-gradient-type';
import {clearSelection} from '../helper/selection';
import FillTool from '../helper/bit-tools/fill-tool';
import {generateSecondaryColor, MIXED} from '../helper/style-path';

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
        if (this.tool) {
            if (nextProps.color !== this.props.color) {
                this.tool.setColor(nextProps.color);
            }
            if (nextProps.color2 !== this.props.color2) {
                this.tool.setColor2(nextProps.color2);
            }
            if (nextProps.fillModeGradientType !== this.props.fillModeGradientType) {
                this.tool.setGradientType(nextProps.fillModeGradientType);
            }
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
    componentWillUnmount () {
        if (this.tool) {
            this.deactivateTool();
        }
    }
    activateTool () {
        clearSelection(this.props.clearSelectedItems);

        // Force the default brush color if fill is MIXED or transparent
        let color = this.props.color;
        if (this.props.color === MIXED) {
            color = DEFAULT_COLOR;
            this.props.onChangeFillColor(DEFAULT_COLOR, 0);
        }
        const gradientType = this.props.fillModeGradientType ?
            this.props.fillModeGradientType : this.props.styleGradientType;
        let color2 = this.props.color2;
        if (gradientType !== this.props.styleGradientType) {
            if (this.props.styleGradientType === GradientTypes.SOLID) {
                color2 = generateSecondaryColor(color);
                this.props.onChangeFillColor(color2, 1);
            }
            this.props.changeGradientType(gradientType);
        }
        if (this.props.color2 === MIXED) {
            color2 = generateSecondaryColor();
            this.props.onChangeFillColor(color2, 1);
        }
        this.tool = new FillTool(this.props.onUpdateImage);
        this.tool.setColor(color);
        this.tool.setColor2(color2);
        this.tool.setGradientType(gradientType);
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
    changeGradientType: PropTypes.func.isRequired,
    clearSelectedItems: PropTypes.func.isRequired,
    color: PropTypes.string,
    color2: PropTypes.string,
    styleGradientType: PropTypes.oneOf(Object.keys(GradientTypes)).isRequired,
    fillModeGradientType: PropTypes.oneOf(Object.keys(GradientTypes)),
    handleMouseDown: PropTypes.func.isRequired,
    isFillModeActive: PropTypes.bool.isRequired,
    onChangeFillColor: PropTypes.func.isRequired,
    onUpdateImage: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
    fillModeGradientType: state.scratchPaint.fillMode.gradientType, // Last user-selected gradient type
    color: state.scratchPaint.color.fillColor.primary,
    color2: state.scratchPaint.color.fillColor.secondary,
    styleGradientType: state.scratchPaint.color.fillColor.gradientType,
    isFillModeActive: state.scratchPaint.mode === Modes.BIT_FILL
});
const mapDispatchToProps = dispatch => ({
    clearSelectedItems: () => {
        dispatch(clearSelectedItems());
    },
    changeGradientType: gradientType => {
        dispatch(changeGradientType(gradientType));
    },
    handleMouseDown: () => {
        dispatch(changeMode(Modes.BIT_FILL));
    },
    onChangeFillColor: (fillColor, index) => {
        if (index === 0) {
            dispatch(changeFillColor(fillColor));
        } else if (index === 1) {
            dispatch(changeFillColor2(fillColor));
        }
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(BitFillMode);
