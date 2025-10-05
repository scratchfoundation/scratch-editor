import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';
import VM from '@scratch/scratch-vm';

import Box from '../box/box.jsx';
import Loader from '../loader/loader.jsx';
import VisionViewer from '../../lib/vision-viewer';
import styles from './stage-wrapper.css';

/**
 * StageWrapperComponent
 *
 * Componente que reemplaza el escenario estándar de Scratch por la vista del Vision Kit.
 *
 * @param {object} props - Propiedades del componente.
 * @param {boolean} props.isFullScreen - Indica si está en modo pantalla completa.
 * @param {boolean} props.isRtl - Define la orientación del texto (derecha a izquierda).
 * @param {boolean} props.loading - Muestra el loader si está cargando.
 * @param {VM} props.vm - Instancia del Virtual Machine (VM) de Scratch.
 * @returns {JSX.Element} El componente visual del escenario Vision Kit.
 */
const StageWrapperComponent = function ({
    isFullScreen,
    isRtl,
    loading,
    vm
}) {
    return (
        <Box
            className={classNames(
                styles.stageWrapper,
                {[styles.fullScreen]: isFullScreen}
            )}
            dir={isRtl ? 'rtl' : 'ltr'}
        >
            {/* 🔹 Reemplazamos el escenario normal por la vista de Vision Kit */}
            <div className={styles.visionFullScreen}>
                <VisionViewer runtime={vm.runtime} />
            </div>

            {loading ? <Loader isFullScreen={isFullScreen} /> : null}
        </Box>
    );
};

StageWrapperComponent.propTypes = {
    isFullScreen: PropTypes.bool,
    isRtl: PropTypes.bool.isRequired,
    loading: PropTypes.bool,
    vm: PropTypes.instanceOf(VM).isRequired
};

export default StageWrapperComponent;
