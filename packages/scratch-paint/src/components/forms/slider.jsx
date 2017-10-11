import React from 'react';
import PropTypes from 'prop-types';
import bindAll from 'lodash.bindall';

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
            'setBackground'
        ]);
    }

    handleMouseDown () {
        document.addEventListener('mouseup', this.handleMouseUp);
        document.addEventListener('mousemove', this.handleMouseMove);
    }

    handleMouseUp () {
        document.removeEventListener('mouseup', this.handleMouseUp);
        document.removeEventListener('mousemove', this.handleMouseMove);
    }

    handleMouseMove (event) {
        event.preventDefault();
        const backgroundBBox = this.background.getBoundingClientRect();
        const x = event.clientX - backgroundBBox.left;
        this.props.onChange(Math.max(1, Math.min(99, 100 * x / backgroundBBox.width)));
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
                className={styles.container}
                ref={this.setBackground}
                style={{
                    backgroundImage: this.props.background
                }}
            >
                <div
                    className={styles.handle}
                    style={{
                        left: `${handleOffset}px`
                    }}
                    onMouseDown={this.handleMouseDown}
                />
            </div>
        );
    }
}

SliderComponent.propTypes = {
    background: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    value: PropTypes.number.isRequired
};

SliderComponent.defaultProps = {
    background: 'yellow'
};

export default SliderComponent;
