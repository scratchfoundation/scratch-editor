import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import React from 'react';
import bindAll from 'lodash.bindall';
import {changeStrokeWidth} from '../reducers/stroke-width';
import StrokeWidthIndicatorComponent from '../components/stroke-width-indicator.jsx';
import {applyStrokeWidthToSelection} from '../helper/style-path';
import Modes from '../lib/modes';

class StrokeWidthIndicator extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleChangeStrokeWidth'
        ]);
    }
    handleChangeStrokeWidth (newWidth) {
        if (applyStrokeWidthToSelection(newWidth, this.props.textEditTarget)) {
            this.props.onUpdateImage();
        }
        this.props.onChangeStrokeWidth(newWidth);
    }
    render () {
        return (
            <StrokeWidthIndicatorComponent
                disabled={this.props.disabled}
                strokeWidth={this.props.strokeWidth}
                onChangeStrokeWidth={this.handleChangeStrokeWidth}
            />
        );
    }
}

const mapStateToProps = state => ({
    disabled: state.scratchPaint.mode === Modes.BRUSH ||
        state.scratchPaint.mode === Modes.TEXT ||
        state.scratchPaint.mode === Modes.FILL,
    strokeWidth: state.scratchPaint.color.strokeWidth,
    textEditTarget: state.scratchPaint.textEditTarget
});
const mapDispatchToProps = dispatch => ({
    onChangeStrokeWidth: strokeWidth => {
        dispatch(changeStrokeWidth(strokeWidth));
    }
});

StrokeWidthIndicator.propTypes = {
    disabled: PropTypes.bool.isRequired,
    onChangeStrokeWidth: PropTypes.func.isRequired,
    onUpdateImage: PropTypes.func.isRequired,
    strokeWidth: PropTypes.number,
    textEditTarget: PropTypes.number
};

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(StrokeWidthIndicator);
