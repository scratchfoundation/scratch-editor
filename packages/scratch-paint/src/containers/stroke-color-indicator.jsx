import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import React from 'react';
import bindAll from 'lodash.bindall';
import {changeStrokeColor} from '../reducers/stroke-color';
import {changeStrokeWidth} from '../reducers/stroke-width';
import {openStrokeColor, closeStrokeColor} from '../reducers/modals';
import Modes from '../lib/modes';
import Formats from '../lib/format';
import {isBitmap} from '../lib/format';

import StrokeColorIndicatorComponent from '../components/stroke-color-indicator.jsx';
import {applyStrokeColorToSelection, applyStrokeWidthToSelection} from '../helper/style-path';

class StrokeColorIndicator extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleChangeStrokeColor',
            'handleCloseStrokeColor'
        ]);

        // Flag to track whether an svg-update-worthy change has been made
        this._hasChanged = false;
    }
    componentWillReceiveProps (newProps) {
        const {strokeColorModalVisible, onUpdateImage} = this.props;
        if (strokeColorModalVisible && !newProps.strokeColorModalVisible) {
            // Submit the new SVG, which also stores a single undo/redo action.
            if (this._hasChanged) onUpdateImage();
            this._hasChanged = false;
        }
    }
    handleChangeStrokeColor (newColor) {
        if (this.props.strokeColor === null && newColor !== null) {
            this._hasChanged = applyStrokeWidthToSelection(1, this.props.textEditTarget) || this._hasChanged;
            this.props.onChangeStrokeWidth(1);
        } else if (this.props.strokeColor !== null && newColor === null) {
            this._hasChanged = applyStrokeWidthToSelection(0, this.props.textEditTarget) || this._hasChanged;
            this.props.onChangeStrokeWidth(0);
        }
        // Apply color and update redux, but do not update svg until picker closes.
        this._hasChanged =
            applyStrokeColorToSelection(newColor, isBitmap(this.props.format), this.props.textEditTarget) ||
            this._hasChanged;
        this.props.onChangeStrokeColor(newColor);
    }
    handleCloseStrokeColor () {
        if (!this.props.isEyeDropping) {
            this.props.onCloseStrokeColor();
        }
    }
    render () {
        return (
            <StrokeColorIndicatorComponent
                {...this.props}
                onChangeStrokeColor={this.handleChangeStrokeColor}
                onCloseStrokeColor={this.handleCloseStrokeColor}
            />
        );
    }
}

const mapStateToProps = state => ({
    disabled: state.scratchPaint.mode === Modes.BRUSH ||
        state.scratchPaint.mode === Modes.TEXT ||
        state.scratchPaint.mode === Modes.FILL,
    format: state.scratchPaint.format,
    isEyeDropping: state.scratchPaint.color.eyeDropper.active,
    strokeColor: state.scratchPaint.color.strokeColor,
    strokeColorModalVisible: state.scratchPaint.modals.strokeColor,
    textEditTarget: state.scratchPaint.textEditTarget
});

const mapDispatchToProps = dispatch => ({
    onChangeStrokeColor: strokeColor => {
        dispatch(changeStrokeColor(strokeColor));
    },
    onChangeStrokeWidth: strokeWidth => {
        dispatch(changeStrokeWidth(strokeWidth));
    },
    onOpenStrokeColor: () => {
        dispatch(openStrokeColor());
    },
    onCloseStrokeColor: () => {
        dispatch(closeStrokeColor());
    }
});

StrokeColorIndicator.propTypes = {
    format: PropTypes.oneOf(Object.keys(Formats)),
    isEyeDropping: PropTypes.bool.isRequired,
    onChangeStrokeColor: PropTypes.func.isRequired,
    onChangeStrokeWidth: PropTypes.func.isRequired,
    onCloseStrokeColor: PropTypes.func.isRequired,
    onUpdateImage: PropTypes.func.isRequired,
    strokeColor: PropTypes.string,
    strokeColorModalVisible: PropTypes.bool.isRequired,
    textEditTarget: PropTypes.number
};

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(StrokeColorIndicator);
