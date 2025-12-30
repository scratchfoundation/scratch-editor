import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';
import VM from '@scratch/scratch-vm';

import Box from '../box/box.jsx';
import {STAGE_DISPLAY_SIZES} from '../../lib/layout-constants.js';
import StageHeader from '../../containers/stage-header.jsx';
import Stage from '../../containers/stage.jsx';
import Loader from '../loader/loader.jsx';

import styles from './stage-wrapper.css';

const StageWrapperComponent = function (props) {
    const {
        ariaLabel,
        ariaRole,
        isFullScreen,
        isRtl,
        isRendererSupported,
        loading,
        manuallySaveThumbnails,
        onUpdateProjectThumbnail,
        stageSize,
        vm
    } = props;

    return (
        <Box
            className={classNames(
                styles.stageWrapper,
                {[styles.fullScreen]: isFullScreen}
            )}
            dir={isRtl ? 'rtl' : 'ltr'}
            role={ariaRole}
            aria-label={ariaLabel}
        >
            <Box className={styles.stageMenuWrapper}>
                <StageHeader
                    manuallySaveThumbnails={manuallySaveThumbnails}
                    onUpdateProjectThumbnail={onUpdateProjectThumbnail}
                    stageSize={stageSize}
                    vm={vm}
                />
            </Box>
            <Box className={styles.stageCanvasWrapper}>
                {
                    isRendererSupported ?
                        <Stage
                            stageSize={stageSize}
                            vm={vm}
                        /> :
                        null
                }
            </Box>
            {loading ? (
                <Loader isFullScreen={isFullScreen} />
            ) : null}
        </Box>
    );
};

StageWrapperComponent.propTypes = {
    ariaLabel: PropTypes.string,
    ariaRole: PropTypes.string,
    isFullScreen: PropTypes.bool,
    isRendererSupported: PropTypes.bool.isRequired,
    isRtl: PropTypes.bool.isRequired,
    loading: PropTypes.bool,
    manuallySaveThumbnails: PropTypes.bool,
    onUpdateProjectThumbnail: PropTypes.func,
    stageSize: PropTypes.oneOf(Object.keys(STAGE_DISPLAY_SIZES)).isRequired,
    vm: PropTypes.instanceOf(VM).isRequired
};

export default StageWrapperComponent;
