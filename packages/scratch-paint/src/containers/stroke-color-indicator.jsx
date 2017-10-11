import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import React from 'react';
import bindAll from 'lodash.bindall';
import {changeStrokeColor} from '../reducers/stroke-color';
import {openStrokeColor, closeStrokeColor} from '../reducers/modals';

import StrokeColorIndicatorComponent from '../components/stroke-color-indicator.jsx';
import {applyStrokeColorToSelection} from '../helper/style-path';

class StrokeColorIndicator extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleChangeStrokeColor'
        ]);
    }
    handleChangeStrokeColor (newColor) {
        applyStrokeColorToSelection(newColor, this.props.onUpdateSvg);
        this.props.onChangeStrokeColor(newColor);
    }
    render () {
        return (
            <StrokeColorIndicatorComponent
                {...this.props}
                onChangeStrokeColor={this.handleChangeStrokeColor}
            />
        );
    }
}

const mapStateToProps = state => ({
    strokeColor: state.scratchPaint.color.strokeColor,
    strokeColorModalVisible: state.scratchPaint.modals.strokeColor
});

const mapDispatchToProps = dispatch => ({
    onChangeStrokeColor: strokeColor => {
        dispatch(changeStrokeColor(strokeColor));
    },
    onOpenStrokeColor: () => {
        dispatch(openStrokeColor());
    },
    onCloseStrokeColor: () => {
        dispatch(closeStrokeColor());
    }
});

StrokeColorIndicator.propTypes = {
    onChangeStrokeColor: PropTypes.func.isRequired,
    onUpdateSvg: PropTypes.func.isRequired,
    strokeColor: PropTypes.string
};

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(StrokeColorIndicator);
