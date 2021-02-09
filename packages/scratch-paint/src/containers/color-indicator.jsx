import PropTypes from 'prop-types';
import React from 'react';
import bindAll from 'lodash.bindall';
import parseColor from 'parse-color';
import {injectIntl, intlShape} from 'react-intl';

import {getSelectedLeafItems} from '../helper/selection';
import Formats, {isBitmap} from '../lib/format';
import GradientTypes from '../lib/gradient-types';

import ColorIndicatorComponent from '../components/color-indicator.jsx';
import {applyColorToSelection,
    applyGradientTypeToSelection,
    applyStrokeWidthToSelection,
    generateSecondaryColor,
    swapColorsInSelection,
    MIXED} from '../helper/style-path';

const makeColorIndicator = (label, isStroke) => {
    class ColorIndicator extends React.Component {
        constructor (props) {
            super(props);
            bindAll(this, [
                'handleChangeColor',
                'handleChangeGradientType',
                'handleCloseColor',
                'handleSwap'
            ]);

            // Flag to track whether an svg-update-worthy change has been made
            this._hasChanged = false;
        }
        componentWillReceiveProps (newProps) {
            const {colorModalVisible, onUpdateImage} = this.props;
            if (colorModalVisible && !newProps.colorModalVisible) {
                // Submit the new SVG, which also stores a single undo/redo action.
                if (this._hasChanged) onUpdateImage();
                this._hasChanged = false;
            }
        }
        handleChangeColor (newColor) {
            // Stroke-selector-specific logic: if we change the stroke color from "none" to something visible, ensure
            // there's a nonzero stroke width. If we change the stroke color to "none", set the stroke width to zero.
            if (isStroke) {

                // Whether the old color style in this color indicator was null (completely transparent).
                // If it's a solid color, this means that the first color is null.
                // If it's a gradient, this means both colors are null.
                const oldStyleWasNull = this.props.gradientType === GradientTypes.SOLID ?
                    this.props.color === null :
                    this.props.color === null && this.props.color2 === null;

                const otherColor = this.props.colorIndex === 1 ? this.props.color : this.props.color2;
                // Whether the new color style in this color indicator is null.
                const newStyleIsNull = this.props.gradientType === GradientTypes.SOLID ?
                    newColor === null :
                    newColor === null && otherColor === null;

                if (oldStyleWasNull && !newStyleIsNull) {
                    this._hasChanged = applyStrokeWidthToSelection(1, this.props.textEditTarget) || this._hasChanged;
                    this.props.onChangeStrokeWidth(1);
                } else if (!oldStyleWasNull && newStyleIsNull) {
                    this._hasChanged = applyStrokeWidthToSelection(0, this.props.textEditTarget) || this._hasChanged;
                    this.props.onChangeStrokeWidth(0);
                }
            }

            const formatIsBitmap = isBitmap(this.props.format);
            // Apply color and update redux, but do not update svg until picker closes.
            const isDifferent = applyColorToSelection(
                newColor,
                this.props.colorIndex,
                this.props.gradientType === GradientTypes.SOLID,
                // In bitmap mode, only the fill color selector is used, but it applies to stroke if fillBitmapShapes
                // is set to true via the "Fill"/"Outline" selector button
                isStroke || (formatIsBitmap && !this.props.fillBitmapShapes),
                this.props.textEditTarget);
            this._hasChanged = this._hasChanged || isDifferent;
            this.props.onChangeColor(newColor, this.props.colorIndex);
        }
        handleChangeGradientType (gradientType) {
            const formatIsBitmap = isBitmap(this.props.format);
            // Apply color and update redux, but do not update svg until picker closes.
            const isDifferent = applyGradientTypeToSelection(
                gradientType,
                isStroke || (formatIsBitmap && !this.props.fillBitmapShapes),
                this.props.textEditTarget);
            this._hasChanged = this._hasChanged || isDifferent;
            const hasSelectedItems = getSelectedLeafItems().length > 0;
            if (hasSelectedItems) {
                if (isDifferent) {
                    // Recalculates the swatch colors
                    this.props.setSelectedItems(this.props.format);
                }
            }
            if (this.props.gradientType === GradientTypes.SOLID && gradientType !== GradientTypes.SOLID) {
                // Generate color 2 and change to the 2nd swatch when switching from solid to gradient
                if (!hasSelectedItems) {
                    this.props.onChangeColor(generateSecondaryColor(this.props.color), 1);
                }
                this.props.onChangeColorIndex(1);
            }
            if (this.props.onChangeGradientType) this.props.onChangeGradientType(gradientType);
        }
        handleCloseColor () {
            // If the eyedropper is currently being used, don't
            // close the color menu.
            if (this.props.isEyeDropping) return;

            // Otherwise, close the color menu and
            // also reset the color index to indicate
            // that `color1` is selected.
            this.props.onCloseColor();
            this.props.onChangeColorIndex(0);
        }
        handleSwap () {
            if (getSelectedLeafItems().length) {
                const formatIsBitmap = isBitmap(this.props.format);
                const isDifferent = swapColorsInSelection(
                    isStroke || (formatIsBitmap && !this.props.fillBitmapShapes),
                    this.props.textEditTarget);
                this.props.setSelectedItems(this.props.format);
                this._hasChanged = this._hasChanged || isDifferent;
            } else {
                let color1 = this.props.color;
                let color2 = this.props.color2;
                color1 = color1 === null || color1 === MIXED ? color1 : parseColor(color1).hex;
                color2 = color2 === null || color2 === MIXED ? color2 : parseColor(color2).hex;
                this.props.onChangeColor(color1, 1);
                this.props.onChangeColor(color2, 0);
            }
        }
        render () {
            return (
                <ColorIndicatorComponent
                    {...this.props}
                    label={this.props.intl.formatMessage(label)}
                    outline={isStroke}
                    onChangeColor={this.handleChangeColor}
                    onChangeGradientType={this.handleChangeGradientType}
                    onCloseColor={this.handleCloseColor}
                    onSwap={this.handleSwap}
                />
            );
        }
    }

    ColorIndicator.propTypes = {
        colorIndex: PropTypes.number.isRequired,
        disabled: PropTypes.bool.isRequired,
        color: PropTypes.string,
        color2: PropTypes.string,
        colorModalVisible: PropTypes.bool.isRequired,
        fillBitmapShapes: PropTypes.bool.isRequired,
        format: PropTypes.oneOf(Object.keys(Formats)),
        gradientType: PropTypes.oneOf(Object.keys(GradientTypes)).isRequired,
        intl: intlShape,
        isEyeDropping: PropTypes.bool.isRequired,
        onChangeColorIndex: PropTypes.func.isRequired,
        onChangeColor: PropTypes.func.isRequired,
        onChangeGradientType: PropTypes.func,
        onChangeStrokeWidth: PropTypes.func,
        onCloseColor: PropTypes.func.isRequired,
        onUpdateImage: PropTypes.func.isRequired,
        setSelectedItems: PropTypes.func.isRequired,
        textEditTarget: PropTypes.number
    };

    return injectIntl(ColorIndicator);
};

export default makeColorIndicator;
