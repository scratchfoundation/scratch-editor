import {connect} from 'react-redux';
import {defineMessages} from 'react-intl';

import {changeColorIndex} from '../reducers/color-index';
import {changeStrokeColor, changeStrokeColor2, changeStrokeGradientType} from '../reducers/stroke-style';
import {changeStrokeWidth} from '../reducers/stroke-width';
import {openStrokeColor, closeStrokeColor} from '../reducers/modals';
import {getSelectedLeafItems} from '../helper/selection';
import {setSelectedItems} from '../reducers/selected-items';
import Modes, {GradientToolsModes} from '../lib/modes';
import {isBitmap} from '../lib/format';

import makeColorIndicator from './color-indicator.jsx';

const messages = defineMessages({
    label: {
        id: 'paint.paintEditor.stroke',
        description: 'Label for the color picker for the outline color',
        defaultMessage: 'Outline'
    }
});

const StrokeColorIndicator = makeColorIndicator(messages.label, true);

const mapStateToProps = state => ({
    colorIndex: state.scratchPaint.fillMode.colorIndex,
    disabled: state.scratchPaint.mode === Modes.BRUSH ||
        state.scratchPaint.mode === Modes.TEXT ||
        state.scratchPaint.mode === Modes.FILL,
    color: state.scratchPaint.color.strokeColor.primary,
    color2: state.scratchPaint.color.strokeColor.secondary,
    fillBitmapShapes: state.scratchPaint.fillBitmapShapes,
    colorModalVisible: state.scratchPaint.modals.strokeColor,
    format: state.scratchPaint.format,
    gradientType: state.scratchPaint.color.strokeColor.gradientType,
    isEyeDropping: state.scratchPaint.color.eyeDropper.active,
    mode: state.scratchPaint.mode,
    shouldShowGradientTools: state.scratchPaint.mode in GradientToolsModes,
    textEditTarget: state.scratchPaint.textEditTarget
});

const mapDispatchToProps = dispatch => ({
    onChangeColorIndex: index => {
        dispatch(changeColorIndex(index));
    },
    onChangeColor: (strokeColor, index) => {
        if (index === 0) {
            dispatch(changeStrokeColor(strokeColor));
        } else if (index === 1) {
            dispatch(changeStrokeColor2(strokeColor));
        }
    },
    onChangeStrokeWidth: strokeWidth => {
        dispatch(changeStrokeWidth(strokeWidth));
    },
    onOpenColor: () => {
        dispatch(openStrokeColor());
    },
    onCloseColor: () => {
        dispatch(closeStrokeColor());
    },
    onChangeGradientType: gradientType => {
        dispatch(changeStrokeGradientType(gradientType));
    },
    setSelectedItems: format => {
        dispatch(setSelectedItems(getSelectedLeafItems(), isBitmap(format)));
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(StrokeColorIndicator);
