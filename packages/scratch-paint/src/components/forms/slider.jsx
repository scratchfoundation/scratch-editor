import React from 'react';
import PropTypes from 'prop-types';
import bindAll from 'lodash.bindall';
import classNames from 'classnames';
import {getEventXY} from '../../lib/touch-utils';

import styles from './slider.css';

const CONTAINER_WIDTH = 150;
const HANDLE_WIDTH = 26;

class SliderComponent extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleMouseDown',
            'handleMouseUp',
            'handleMouseMove',
            'handleClickBackground',
            'setBackground'
        ]);
    }

    handleMouseDown () {
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);
        document.addEventListener('touchmove', this.handleMouseMove);
        document.addEventListener('touchend', this.handleMouseUp);
    }

    handleMouseUp () {
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        document.removeEventListener('touchmove', this.handleMouseMove);
        document.removeEventListener('touchend', this.handleMouseUp);
    }

    handleMouseMove (event) {
        event.preventDefault();
        this.props.onChange(this.scaleMouseToSliderPosition(event));
    }

    handleClickBackground (event) {
        this.props.onChange(this.scaleMouseToSliderPosition(event));
    }

    scaleMouseToSliderPosition (event){
        const {x} = getEventXY(event);
        const backgroundBBox = this.background.getBoundingClientRect();
        const scaledX = x - backgroundBBox.left;
        return Math.max(0, Math.min(100, 100 * scaledX / backgroundBBox.width));
    }

    setBackground (ref) {
        this.background = ref;
    }

    render () {
        const halfHandleWidth = HANDLE_WIDTH / 2;
        const pixelMin = halfHandleWidth;
        const pixelMax = CONTAINER_WIDTH - halfHandleWidth;
        const handleOffset = pixelMin +
            ((pixelMax - pixelMin) * (this.props.value / 100)) -
            halfHandleWidth;
        return (
            <div
                className={classNames({
                    [styles.container]: true,
                    [styles.last]: this.props.lastSlider
                })}
                ref={this.setBackground}
                style={{
                    backgroundImage: this.props.background
                }}
                onClick={this.handleClickBackground}
            >
                <div
                    className={styles.handle}
                    style={{
                        left: `${handleOffset}px`
                    }}
                    onMouseDown={this.handleMouseDown}
                    onTouchStart={this.handleMouseDown}
                />
            </div>
        );
    }
}

SliderComponent.propTypes = {
    background: PropTypes.string,
    lastSlider: PropTypes.bool,
    onChange: PropTypes.func.isRequired,
    value: PropTypes.number.isRequired
};

SliderComponent.defaultProps = {
    background: 'yellow'
};

export default SliderComponent;
