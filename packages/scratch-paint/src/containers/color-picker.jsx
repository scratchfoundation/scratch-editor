import bindAll from 'lodash.bindall';
import {connect} from 'react-redux';
import parseColor from 'parse-color';
import PropTypes from 'prop-types';
import React from 'react';

import {clearSelectedItems} from '../reducers/selected-items';
import {activateEyeDropper} from '../reducers/eye-dropper';
import {changeMode} from '../reducers/modes';

import ColorPickerComponent from '../components/color-picker/color-picker.jsx';
import {MIXED} from '../helper/style-path';
import Modes from '../lib/modes';

const colorStringToHsv = hexString => {
    const hsv = parseColor(hexString).hsv;
    // Hue comes out in [0, 360], limit to [0, 100]
    hsv[0] = hsv[0] / 3.6;
    // Black is parsed as {0, 0, 0}, but turn saturation up to 100
    // to make it easier to see slider values.
    if (hsv[1] === 0 && hsv[2] === 0) {
        hsv[1] = 100;
    }
    return hsv;
};

const hsvToHex = (h, s, v) =>
    // Scale hue back up to [0, 360] from [0, 100]
    parseColor(`hsv(${3.6 * h}, ${s}, ${v})`).hex
;

// Important! This component ignores new color props and cannot be updated
// This is to make the HSV <=> RGB conversion stable. Because of this, the
// component MUST be unmounted in order to change the props externally.
class ColorPicker extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleHueChange',
            'handleSaturationChange',
            'handleBrightnessChange',
            'handleTransparent',
            'handleActivateEyeDropper'
        ]);
        const isTransparent = this.props.color === null;
        const isMixed = this.props.color === MIXED;
        const hsv = isTransparent || isMixed ?
            [50, 100, 100] : colorStringToHsv(props.color);

        this.state = {
            hue: hsv[0],
            saturation: hsv[1],
            brightness: hsv[2]
        };
    }
    componentWillReceiveProps () {
        // Just a reminder, new props do not update the hsv state
    }
    handleHueChange (hue) {
        this.setState({hue: hue});
        this.handleColorChange();
    }
    handleSaturationChange (saturation) {
        this.setState({saturation: saturation});
        this.handleColorChange();
    }
    handleBrightnessChange (brightness) {
        this.setState({brightness: brightness});
        this.handleColorChange();
    }
    handleColorChange () {
        this.props.onChangeColor(hsvToHex(
            this.state.hue,
            this.state.saturation,
            this.state.brightness
        ));
    }
    handleTransparent () {
        this.props.onChangeColor(null);
    }
    handleActivateEyeDropper () {
        this.props.onActivateEyeDropper(
            this.props.currentMode,
            this.props.onChangeColor
        );
    }
    render () {
        return (
            <ColorPickerComponent
                brightness={this.state.brightness}
                color={this.props.color}
                hue={this.state.hue}
                isEyeDropping={this.props.isEyeDropping}
                saturation={this.state.saturation}
                onActivateEyeDropper={this.handleActivateEyeDropper}
                onBrightnessChange={this.handleBrightnessChange}
                onChangeColor={this.props.onChangeColor}
                onHueChange={this.handleHueChange}
                onSaturationChange={this.handleSaturationChange}
                onTransparent={this.handleTransparent}
            />
        );
    }
}

ColorPicker.propTypes = {
    color: PropTypes.string,
    currentMode: PropTypes.string,
    isEyeDropping: PropTypes.bool.isRequired,
    onActivateEyeDropper: PropTypes.func.isRequired,
    onChangeColor: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
    currentMode: state.scratchPaint.mode,
    isEyeDropping: state.scratchPaint.color.eyeDropper.active,
});

const mapDispatchToProps = dispatch => ({
    clearSelectedItems: () => {
        dispatch(clearSelectedItems());
    },
    onActivateEyeDropper: (currentMode, callback) => {
        dispatch(changeMode(Modes.EYE_DROPPER));
        dispatch(activateEyeDropper(currentMode, callback));
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(ColorPicker);
