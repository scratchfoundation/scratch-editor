import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import React from 'react';
import bindAll from 'lodash.bindall';
import parseColor from 'parse-color';

import {changeColorIndex} from '../reducers/color-index';
import {changeFillColor} from '../reducers/fill-color';
import {changeFillColor2} from '../reducers/fill-color-2';
import {changeGradientType} from '../reducers/fill-mode-gradient-type';
import {openFillColor, closeFillColor} from '../reducers/modals';
import {getSelectedLeafItems} from '../helper/selection';
import {setSelectedItems} from '../reducers/selected-items';
import Modes from '../lib/modes';
import Formats from '../lib/format';
import {isBitmap} from '../lib/format';
import GradientTypes from '../lib/gradient-types';

import FillColorIndicatorComponent from '../components/fill-color-indicator.jsx';
import {applyFillColorToSelection,
    applyGradientTypeToSelection,
    getRotatedColor,
    swapColorsInSelection,
    MIXED} from '../helper/style-path';

class FillColorIndicator extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleChangeFillColor',
            'handleChangeGradientType',
            'handleCloseFillColor',
            'handleSwap'
        ]);

        // Flag to track whether an svg-update-worthy change has been made
        this._hasChanged = false;
    }
    componentWillReceiveProps (newProps) {
        const {fillColorModalVisible, onUpdateImage} = this.props;
        if (fillColorModalVisible && !newProps.fillColorModalVisible) {
            // Submit the new SVG, which also stores a single undo/redo action.
            if (this._hasChanged) onUpdateImage();
            this._hasChanged = false;
        }
    }
    handleChangeFillColor (newColor) {
        // Apply color and update redux, but do not update svg until picker closes.
        const isDifferent = applyFillColorToSelection(
            newColor,
            this.props.colorIndex,
            this.props.gradientType === GradientTypes.SOLID,
            isBitmap(this.props.format),
            this.props.textEditTarget);
        this._hasChanged = this._hasChanged || isDifferent;
        this.props.onChangeFillColor(newColor, this.props.colorIndex);
    }
    handleChangeGradientType (gradientType) {
        // Apply color and update redux, but do not update svg until picker closes.
        const isDifferent = applyGradientTypeToSelection(
            gradientType,
            isBitmap(this.props.format),
            this.props.textEditTarget);
        this._hasChanged = this._hasChanged || isDifferent;
        const hasSelectedItems = getSelectedLeafItems().length > 0;
        if (hasSelectedItems) {
            if (isDifferent) {
                // Recalculates the swatch colors
                this.props.setSelectedItems();
            }
        }
        if (this.props.gradientType === GradientTypes.SOLID && gradientType !== GradientTypes.SOLID) {
            // Generate color 2 and change to the 2nd swatch when switching from solid to gradient
            if (!hasSelectedItems) {
                this.props.onChangeFillColor(getRotatedColor(this.props.fillColor), 1);
            }
            this.props.onChangeColorIndex(1);
        }
        this.props.onChangeGradientType(gradientType);
    }
    handleCloseFillColor () {
        // If the eyedropper is currently being used, don't
        // close the fill color menu.
        if (this.props.isEyeDropping) return;

        // Otherwise, close the fill color menu and
        // also reset the color index to indicate
        // that `color1` is selected.
        this.props.onCloseFillColor();
        this.props.onChangeColorIndex(0);
    }
    handleSwap () {
        if (getSelectedLeafItems().length) {
            swapColorsInSelection(
                isBitmap(this.props.format),
                this.props.textEditTarget);
            this.props.setSelectedItems();
        } else {
            let color1 = this.props.fillColor;
            let color2 = this.props.fillColor2;
            color1 = color1 === null || color1 === MIXED ? color1 : parseColor(color1).hex;
            color2 = color2 === null || color2 === MIXED ? color2 : parseColor(color2).hex;
            this.props.onChangeFillColor(color1, 1);
            this.props.onChangeFillColor(color2, 0);
        }
    }
    render () {
        return (
            <FillColorIndicatorComponent
                {...this.props}
                onChangeFillColor={this.handleChangeFillColor}
                onChangeGradientType={this.handleChangeGradientType}
                onCloseFillColor={this.handleCloseFillColor}
                onSwap={this.handleSwap}
            />
        );
    }
}

const mapStateToProps = state => ({
    colorIndex: state.scratchPaint.fillMode.colorIndex,
    disabled: state.scratchPaint.mode === Modes.LINE,
    fillColor: state.scratchPaint.color.fillColor,
    fillColor2: state.scratchPaint.color.fillColor2,
    fillColorModalVisible: state.scratchPaint.modals.fillColor,
    format: state.scratchPaint.format,
    gradientType: state.scratchPaint.color.gradientType,
    isEyeDropping: state.scratchPaint.color.eyeDropper.active,
    mode: state.scratchPaint.mode,
    shouldShowGradientTools: state.scratchPaint.mode === Modes.SELECT ||
        state.scratchPaint.mode === Modes.RESHAPE ||
        state.scratchPaint.mode === Modes.FILL ||
        state.scratchPaint.mode === Modes.BIT_FILL,
    textEditTarget: state.scratchPaint.textEditTarget
});

const mapDispatchToProps = dispatch => ({
    onChangeColorIndex: index => {
        dispatch(changeColorIndex(index));
    },
    onChangeFillColor: (fillColor, index) => {
        if (index === 0) {
            dispatch(changeFillColor(fillColor));
        } else if (index === 1) {
            dispatch(changeFillColor2(fillColor));
        }
    },
    onOpenFillColor: () => {
        dispatch(openFillColor());
    },
    onCloseFillColor: () => {
        dispatch(closeFillColor());
    },
    onChangeGradientType: gradientType => {
        dispatch(changeGradientType(gradientType));
    },
    setSelectedItems: format => {
        dispatch(setSelectedItems(getSelectedLeafItems(), isBitmap(format)));
    }
});

FillColorIndicator.propTypes = {
    colorIndex: PropTypes.number.isRequired,
    disabled: PropTypes.bool.isRequired,
    fillColor: PropTypes.string,
    fillColor2: PropTypes.string,
    fillColorModalVisible: PropTypes.bool.isRequired,
    format: PropTypes.oneOf(Object.keys(Formats)),
    gradientType: PropTypes.oneOf(Object.keys(GradientTypes)).isRequired,
    isEyeDropping: PropTypes.bool.isRequired,
    onChangeColorIndex: PropTypes.func.isRequired,
    onChangeFillColor: PropTypes.func.isRequired,
    onChangeGradientType: PropTypes.func.isRequired,
    onCloseFillColor: PropTypes.func.isRequired,
    onUpdateImage: PropTypes.func.isRequired,
    setSelectedItems: PropTypes.func.isRequired,
    textEditTarget: PropTypes.number
};

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(FillColorIndicator);
