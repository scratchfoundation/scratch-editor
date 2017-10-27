import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import React from 'react';
import bindAll from 'lodash.bindall';
import {changeFillColor} from '../reducers/fill-color';
import {openFillColor, closeFillColor} from '../reducers/modals';
import Modes from '../modes/modes';

import FillColorIndicatorComponent from '../components/fill-color-indicator.jsx';
import {applyFillColorToSelection} from '../helper/style-path';

class FillColorIndicator extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleChangeFillColor'
        ]);
    }
    handleChangeFillColor (newColor) {
        applyFillColorToSelection(newColor, this.props.onUpdateSvg);
        this.props.onChangeFillColor(newColor);
    }
    render () {
        return (
            <FillColorIndicatorComponent
                {...this.props}
                onChangeFillColor={this.handleChangeFillColor}
            />
        );
    }
}

const mapStateToProps = state => ({
    disabled: state.scratchPaint.mode === Modes.PEN,
    fillColor: state.scratchPaint.color.fillColor,
    fillColorModalVisible: state.scratchPaint.modals.fillColor
});

const mapDispatchToProps = dispatch => ({
    onChangeFillColor: fillColor => {
        dispatch(changeFillColor(fillColor));
    },
    onOpenFillColor: () => {
        dispatch(openFillColor());
    },
    onCloseFillColor: () => {
        dispatch(closeFillColor());
    }
});

FillColorIndicator.propTypes = {
    disabled: PropTypes.bool.isRequired,
    fillColor: PropTypes.string,
    onChangeFillColor: PropTypes.func.isRequired,
    onUpdateSvg: PropTypes.func.isRequired
};

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(FillColorIndicator);
