import React from 'react';
import PropTypes from 'prop-types';

import styles from './scrollable-canvas.css';

const ScrollableCanvasComponent = props => (
    <div
        className={props.style}
    >
        {props.children}
        <div
            className={styles.horizontalScrollbarWrapper}
            style={{pointerEvents: 'none'}}
        >
            <div
                className={styles.horizontalScrollbarHitbox}
                style={{
                    width: `${props.horizontalScrollLengthPercent}%`,
                    left: `${props.horizontalScrollStartPercent}%`,
                    pointerEvents: 'auto',
                    display: `${props.hideScrollbars ||
                        Math.abs(props.horizontalScrollLengthPercent - 100) < 1e-8 ? 'none' : 'block'}`
                }}
                onMouseDown={props.onHorizontalScrollbarMouseDown}
                onTouchStart={props.onHorizontalScrollbarMouseDown}
            >
                <div
                    className={styles.horizontalScrollbar}
                />
            </div>
        </div>
        <div
            className={styles.verticalScrollbarWrapper}
            style={{pointerEvents: 'none'}}
        >
            <div
                className={styles.verticalScrollbarHitbox}
                style={{
                    height: `${props.verticalScrollLengthPercent}%`,
                    top: `${props.verticalScrollStartPercent}%`,
                    pointerEvents: 'auto',
                    display: `${props.hideScrollbars ||
                        Math.abs(props.verticalScrollLengthPercent - 100) < 1e-8 ? 'none' : 'block'}`
                }}
                onMouseDown={props.onVerticalScrollbarMouseDown}
                onTouchStart={props.onVerticalScrollbarMouseDown}
            >
                <div
                    className={styles.verticalScrollbar}
                />
            </div>
        </div>
    </div>
);

ScrollableCanvasComponent.propTypes = {
    children: PropTypes.node.isRequired,
    hideScrollbars: PropTypes.bool,
    horizontalScrollLengthPercent: PropTypes.number,
    horizontalScrollStartPercent: PropTypes.number,
    onHorizontalScrollbarMouseDown: PropTypes.func.isRequired,
    onVerticalScrollbarMouseDown: PropTypes.func.isRequired,
    style: PropTypes.string,
    verticalScrollLengthPercent: PropTypes.number,
    verticalScrollStartPercent: PropTypes.number
};

export default ScrollableCanvasComponent;
