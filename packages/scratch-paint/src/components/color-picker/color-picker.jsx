import React from 'react';
import PropTypes from 'prop-types';
import {FormattedMessage} from 'react-intl';
import classNames from 'classnames';
import parseColor from 'parse-color';

import Slider from '../forms/slider.jsx';

import styles from './color-picker.css';

import eyeDropperIcon from './eye-dropper.svg';
import noFillIcon from '../color-button/no-fill.svg';

const hsvToHex = (h, s, v) =>
    // Scale hue back up to [0, 360] from [0, 100]
    parseColor(`hsv(${3.6 * h}, ${s}, ${v})`).hex
;

class ColorPickerComponent extends React.Component {
    _makeBackground (channel) {
        const stops = [];
        // Generate the color slider background CSS gradients by adding
        // color stops depending on the slider.
        for (let n = 100; n >= 0; n -= 10) {
            switch (channel) {
            case 'hue':
                stops.push(hsvToHex(n, this.props.saturation, this.props.brightness));
                break;
            case 'saturation':
                stops.push(hsvToHex(this.props.hue, n, this.props.brightness));
                break;
            case 'brightness':
                stops.push(hsvToHex(this.props.hue, this.props.saturation, n));
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
                            {Math.round(this.props.hue)}
                        </span>
                    </div>
                    <div className={styles.rowSlider}>
                        <Slider
                            background={this._makeBackground('hue')}
                            value={this.props.hue}
                            onChange={this.props.onHueChange}
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
                            {Math.round(this.props.saturation)}
                        </span>
                    </div>
                    <div className={styles.rowSlider}>
                        <Slider
                            background={this._makeBackground('saturation')}
                            value={this.props.saturation}
                            onChange={this.props.onSaturationChange}
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
                            {Math.round(this.props.brightness)}
                        </span>
                    </div>
                    <div className={styles.rowSlider}>
                        <Slider
                            background={this._makeBackground('brightness')}
                            value={this.props.brightness}
                            onChange={this.props.onBrightnessChange}
                        />
                    </div>
                </div>
                <div className={styles.divider} />
                <div className={styles.swatchRow}>
                    <div className={styles.swatches}>
                        <div
                            className={classNames({
                                [styles.swatch]: true,
                                [styles.activeSwatch]: this.props.color === null
                            })}
                            onClick={this.props.onTransparent}
                        >
                            <img src={noFillIcon} />
                        </div>
                    </div>
                    <div className={styles.swatches}>
                        <div
                            className={classNames({
                                [styles.swatch]: true,
                                [styles.activeSwatch]: this.props.isEyeDropping
                            })}
                            onClick={this.props.onActivateEyeDropper}
                        >
                            <img src={eyeDropperIcon} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

ColorPickerComponent.propTypes = {
    brightness: PropTypes.number.isRequired,
    color: PropTypes.string,
    hue: PropTypes.number.isRequired,
    isEyeDropping: PropTypes.bool.isRequired,
    onActivateEyeDropper: PropTypes.func.isRequired,
    onBrightnessChange: PropTypes.func.isRequired,
    onHueChange: PropTypes.func.isRequired,
    onSaturationChange: PropTypes.func.isRequired,
    onTransparent: PropTypes.func.isRequired,
    saturation: PropTypes.number.isRequired
};

export default ColorPickerComponent;
