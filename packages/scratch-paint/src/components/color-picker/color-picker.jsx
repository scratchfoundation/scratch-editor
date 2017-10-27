import React from 'react';
import PropTypes from 'prop-types';
import {FormattedMessage} from 'react-intl';
import classNames from 'classnames';
import parseColor from 'parse-color';
import bindAll from 'lodash.bindall';

import {MIXED} from '../../helper/style-path';

import Slider from '../forms/slider.jsx';
import styles from './color-picker.css';
import noFillIcon from '../color-button/no-fill.svg';

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
class ColorPickerComponent extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleHueChange',
            'handleSaturationChange',
            'handleBrightnessChange',
            'handleTransparent'
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

    _makeBackground (channel) {
        const stops = [];
        // Generate the color slider background CSS gradients by adding
        // color stops depending on the slider.
        for (let n = 100; n >= 0; n -= 10) {
            switch (channel) {
            case 'hue':
                stops.push(hsvToHex(n, this.state.saturation, this.state.brightness));
                break;
            case 'saturation':
                stops.push(hsvToHex(this.state.hue, n, this.state.brightness));
                break;
            case 'brightness':
                stops.push(hsvToHex(this.state.hue, this.state.saturation, n));
                break;
            default:
                throw new Error(`Unknown channel for color sliders: ${channel}`);
            }
        }
        return `linear-gradient(to left, ${stops.join(',')})`;
    }

    render () {
        return (
            <div className={styles.colorPickerContainer}>
                <div className={styles.row}>
                    <div className={styles.rowHeader}>
                        <span className={styles.labelName}>
                            <FormattedMessage
                                defaultMessage="Color"
                                description="Label for the hue component in the color picker"
                                id="paint.paintEditor.hue"
                            />
                        </span>
                        <span className={styles.labelReadout}>
                            {Math.round(this.state.hue)}
                        </span>
                    </div>
                    <div className={styles.rowSlider}>
                        <Slider
                            background={this._makeBackground('hue')}
                            value={this.state.hue}
                            onChange={this.handleHueChange}
                        />
                    </div>
                </div>
                <div className={styles.row}>
                    <div className={styles.rowHeader}>
                        <span className={styles.labelName}>
                            <FormattedMessage
                                defaultMessage="Saturation"
                                description="Label for the saturation component in the color picker"
                                id="paint.paintEditor.saturation"
                            />
                        </span>
                        <span className={styles.labelReadout}>
                            {Math.round(this.state.saturation)}
                        </span>
                    </div>
                    <div className={styles.rowSlider}>
                        <Slider
                            background={this._makeBackground('saturation')}
                            value={this.state.saturation}
                            onChange={this.handleSaturationChange}
                        />
                    </div>
                </div>
                <div className={styles.row}>
                    <div className={styles.rowHeader}>
                        <span className={styles.labelName}>
                            <FormattedMessage
                                defaultMessage="Brightness"
                                description="Label for the brightness component in the color picker"
                                id="paint.paintEditor.brightness"
                            />
                        </span>
                        <span className={styles.labelReadout}>
                            {Math.round(this.state.brightness)}
                        </span>
                    </div>
                    <div className={styles.rowSlider}>
                        <Slider
                            background={this._makeBackground('brightness')}
                            value={this.state.brightness}
                            onChange={this.handleBrightnessChange}
                        />
                    </div>
                </div>
                <div className={styles.divider} />
                <div className={styles.row}>
                    <div className={styles.swatches}>
                        <div
                            className={classNames({
                                [styles.swatch]: true,
                                [styles.activeSwatch]: this.props.color === null
                            })}
                            onClick={this.handleTransparent}
                        >
                            <img src={noFillIcon} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}


ColorPickerComponent.propTypes = {
    color: PropTypes.string,
    onChangeColor: PropTypes.func.isRequired
};

export default ColorPickerComponent;
