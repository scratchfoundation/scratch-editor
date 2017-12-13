import PropTypes from 'prop-types';
import React from 'react';
import bindAll from 'lodash.bindall';

import Box from '../box/box.jsx';

import {LOUPE_RADIUS} from '../../helper/tools/eye-dropper';

import styles from './loupe.css';

const ZOOM_SCALE = 3;

class LoupeComponent extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'setCanvas'
        ]);
    }
    componentDidUpdate () {
        this.draw();
    }
    draw () {
        const boxSize = 6 / ZOOM_SCALE;
        const boxLineWidth = 1 / ZOOM_SCALE;
        const colorRingWidth = 15 / ZOOM_SCALE;

        const color = this.props.colorInfo.color;

        const ctx = this.canvas.getContext('2d');
        this.canvas.width = ZOOM_SCALE * (LOUPE_RADIUS * 2);
        this.canvas.height = ZOOM_SCALE * (LOUPE_RADIUS * 2);

        // In order to scale the image data, must draw to a tmp canvas first
        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = LOUPE_RADIUS * 2;
        tmpCanvas.height = LOUPE_RADIUS * 2;
        const tmpCtx = tmpCanvas.getContext('2d');
        const imageData = tmpCtx.createImageData(
            LOUPE_RADIUS * 2, LOUPE_RADIUS * 2
        );
        imageData.data.set(this.props.colorInfo.data);
        tmpCtx.putImageData(imageData, 0, 0);

        // Scale the loupe canvas and draw the zoomed image
        ctx.save();
        ctx.scale(ZOOM_SCALE, ZOOM_SCALE);
        ctx.drawImage(tmpCanvas, 0, 0, LOUPE_RADIUS * 2, LOUPE_RADIUS * 2);

        // Draw an outlined square at the cursor position (cursor is hidden)
        ctx.lineWidth = boxLineWidth;
        ctx.strokeStyle = 'black';
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
        ctx.beginPath();
        ctx.rect((20) - (boxSize / 2), (20) - (boxSize / 2), boxSize, boxSize);
        ctx.fill();
        ctx.stroke();

        // Draw a thick ring around the loupe showing the current color
        ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`;
        ctx.lineWidth = colorRingWidth;
        ctx.beginPath();
        ctx.moveTo(LOUPE_RADIUS * 2, LOUPE_RADIUS);
        ctx.arc(LOUPE_RADIUS, LOUPE_RADIUS, LOUPE_RADIUS, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.restore();
    }
    setCanvas (element) {
        this.canvas = element;
    }
    render () {
        const {
            colorInfo,
            pixelRatio,
            ...boxProps
        } = this.props;
        return (
            <Box
                {...boxProps}
                className={styles.eyeDropper}
                componentRef={this.setCanvas}
                element="canvas"
                height={LOUPE_RADIUS * 2}
                style={{
                    top: (colorInfo.y / pixelRatio) - ((ZOOM_SCALE * (LOUPE_RADIUS * 2)) / 2),
                    left: (colorInfo.x / pixelRatio) - ((ZOOM_SCALE * (LOUPE_RADIUS * 2)) / 2),
                    width: (LOUPE_RADIUS * 2) * ZOOM_SCALE,
                    height: (LOUPE_RADIUS * 2) * ZOOM_SCALE
                }}
                width={LOUPE_RADIUS * 2}
            />
        );
    }
}

LoupeComponent.propTypes = {
    colorInfo: PropTypes.shape({
        color: PropTypes.shape({
            r: PropTypes.number,
            g: PropTypes.number,
            b: PropTypes.number
        }),
        x: PropTypes.number,
        y: PropTypes.number,
        data: PropTypes.instanceOf(Uint8ClampedArray)
    }),
    pixelRatio: PropTypes.number.isRequired
};

export default LoupeComponent;
