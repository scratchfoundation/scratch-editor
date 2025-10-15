import React from 'react';
import ReactDOM from 'react-dom';
import {compose} from 'redux';

import AppStateHOC from '../lib/app-state-hoc.jsx';
import GUI from '../containers/gui.jsx';
import HashParserHOC from '../lib/hash-parser-hoc.jsx';
import log from '../lib/log.js';
import {PLATFORM} from '../lib/platform.js';

import registerVisionBlocks from '../lib/vision-autoregister';
import registerVisionExtensions from '../lib/vision-register';
import makeToolboxXML from '../lib/make-toolbox-xml';

/**
 * Renderiza el GUI principal y configura Vision Kit
 * @param {HTMLElement} appTarget - Elemento donde se monta el GUI
 * @param {object} vm - Instancia de la máquina virtual (Scratch VM)
 */
const renderGUI = function (appTarget, vm) {
    GUI.setAppElement(appTarget);

    // ==============================
    // 🧠 Registro base de bloques visuales
    // ==============================
    try {
        registerVisionBlocks();
        console.log('✅ [VisionKit] AutoRegistro visual activado correctamente.');
    } catch (err) {
        console.warn('⚠️ Error al registrar bloques Vision:', err);
    }

    const WrappedGui = compose(AppStateHOC, HashParserHOC)(GUI);

    // ==============================
    // 🔗 Eventos GUI y Telemetría
    // ==============================
    const handleLogoClick = () => {
        window.location = 'https://scratch.mit.edu';
    };
    const handleTelemetryModalCancel = () => log('User canceled telemetry modal');
    const handleTelemetryModalOptIn = () => log('User opted into telemetry');
    const handleTelemetryModalOptOut = () => log('User opted out of telemetry');

    const backpackHostMatches = window.location.href.match(/[?&]backpack_host=([^&]*)&?/);
    const backpackHost = backpackHostMatches ? backpackHostMatches[1] : null;

    const scratchDesktopMatches = window.location.href.match(/[?&]isScratchDesktop=([^&]+)/);
    let simulateScratchDesktop;
    if (scratchDesktopMatches) {
        try {
            simulateScratchDesktop = JSON.parse(scratchDesktopMatches[1]);
        } catch {
            simulateScratchDesktop = scratchDesktopMatches[1];
        }
    }

    if (process.env.NODE_ENV === 'production' && typeof window === 'object') {
        window.onbeforeunload = () => true;
    }

    // ==============================
    // 🖼️ Render principal del GUI
    // ==============================
    const guiProps = simulateScratchDesktop ? {
        vm,
        canEditTitle: true,
        platform: PLATFORM.DESKTOP,
        showTelemetryModal: true,
        canSave: false,
        onTelemetryModalCancel: handleTelemetryModalCancel,
        onTelemetryModalOptIn: handleTelemetryModalOptIn,
        onTelemetryModalOptOut: handleTelemetryModalOptOut
    } : {
        vm,
        canEditTitle: true,
        backpackVisible: true,
        showComingSoon: true,
        backpackHost,
        canSave: false,
        onClickLogo: handleLogoClick
    };

    ReactDOM.render(<WrappedGui {...guiProps} />, appTarget);

    // =======================================================
    // 🧩 Registro manual de extensiones Vision Kit en la VM
    // =======================================================
    setTimeout(async () => {
        try {
            const vmInstance = window.Scratch?.vm;
            if (!vmInstance) {
                console.warn('⚠️ VM no disponible aún.');
                return;
            }

            // ✅ Registrar manualmente todas las extensiones Vision
            await registerVisionExtensions(vmInstance);

            // 🕓 Esperar y refrescar toolbox dinámico
            setTimeout(() => {
                const primitives = Object.keys(vmInstance.runtime._primitives)
                    .filter(p => p.startsWith('vision'));

                console.log(`[VisionKit] Primitivos Vision detectados: ${primitives.length}`);
                if (primitives.length > 0) {
                    const xml = makeToolboxXML();
                    vmInstance.emit('workspaceUpdate', {toolboxXML: xml});
                    console.log('🎨 Toolbox Vision actualizado tras registro manual.');
                } else {
                    console.warn('⚠️ Aún no hay primitivos Vision registrados.');
                }
            }, 1000);
        } catch (err) {
            console.error('❌ Error en registro VisionKit:', err);
        }
    }, 2500);
};

export default renderGUI;
