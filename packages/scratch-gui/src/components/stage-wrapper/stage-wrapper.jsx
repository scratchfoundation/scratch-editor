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
import VisionViewer from '../../lib/vision-viewer';
import VisionStageInjector from '../../lib/vision-stage-injector.jsx';


const StageWrapperComponent = function (props) {
    const {
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
        >
            {/* Escenario de Scratch */}
            <div className={styles.stageCanvas}>
                {isRendererSupported ? (
                    <Stage
                        stageSize={stageSize}
                        vm={vm}
                    />
                ) : null}
                {/* Inyector que pone el backdrop al recibir VISION_IMAGE */}
                <VisionStageInjector vm={vm} />
                {props.children}
            </div>

            {/* Vision Kit - resultados */}
            <div className={styles.visionViewer}>
                <VisionViewer runtime={vm.runtime} />
            </div>

            <Box className={styles.stageMenuWrapper}>
                <StageHeader
                    manuallySaveThumbnails={manuallySaveThumbnails}
                    onUpdateProjectThumbnail={onUpdateProjectThumbnail}
                    stageSize={stageSize}
                    vm={vm}
                />
            </Box>
            {loading ? (
                <Loader isFullScreen={isFullScreen} />
            ) : null}
        </Box>
    );
};

StageWrapperComponent.propTypes = {
    isFullScreen: PropTypes.bool,
    isRendererSupported: PropTypes.bool.isRequired,
    isRtl: PropTypes.bool.isRequired,
    loading: PropTypes.bool,
    manuallySaveThumbnails: PropTypes.bool,
    onUpdateProjectThumbnail: PropTypes.func,
    stageSize: PropTypes.oneOf(Object.keys(STAGE_DISPLAY_SIZES)).isRequired,
    vm: PropTypes.instanceOf(VM).isRequired,
    children: PropTypes.node // ✅ agregado para validar props.children
};

export default StageWrapperComponent;
