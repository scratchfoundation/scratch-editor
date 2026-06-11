import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';

/**
 * Higher Order Component to manage inputs that submit on change and <enter>
 * @param {React.Component} Input text input that consumes onChange, onBlur, onKeyPress
 * @returns {React.Component} Live input that calls onSubmit on change and <enter>
 */
export default function (Input) {
    class LiveInput extends React.Component {
        constructor (props) {
            super(props);
            bindAll(this, [
                'handleChange',
                'handleKeyPress',
                'handleFlush'
            ]);
            this.state = {
                value: null
            };
        }
        handleKeyPress (e) {
            if (e.key === 'Enter') {
                this.handleChange(e);
                e.target.blur();
            }
        }
        handleFlush () {
            this.setState({value: null});
        }
        handleChange (e) {
            const isNumeric = typeof this.props.value === 'number';
            const validatesNumeric = isNumeric ? !isNaN(e.target.value) : true;
            if (e.target.value !== null && validatesNumeric) {
                let val = Number(e.target.value);
                if (typeof this.props.max !== 'undefined' && val > Number(this.props.max)) {
                    val = this.props.max;
                }
                if (typeof this.props.min !== 'undefined' && val < Number(this.props.min)) {
                    val = this.props.min;
                }
                this.props.onSubmit(val);
            }
            this.setState({value: e.target.value});
        }
        render () {
            const liveValue = this.state.value === null ? this.props.value : this.state.value;
            return (
                <Input
                    {...this.props}
                    value={liveValue}
                    onBlur={this.handleFlush}
                    onChange={this.handleChange}
                    onKeyPress={this.handleKeyPress}
                />
            );
        }
    }

    LiveInput.propTypes = {
        max: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        min: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        onSubmit: PropTypes.func.isRequired,
        value: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    };

    return LiveInput;
}
