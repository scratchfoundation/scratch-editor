// ============================
//  Polyfills para compatibilidad
// ============================
import 'es6-object-assign/auto';
import 'core-js/fn/array/includes';
import 'core-js/fn/promise/finally';
import 'intl'; // Para Safari 9

// ============================
//  Librerías principales
// ============================
import React from 'react';
import ReactDOM from 'react-dom';
import VM from '../../../scratch-vm/src/index';

import AppStateHOC from '../lib/app-state-hoc.jsx';
import BrowserModalComponent from '../components/browser-modal/browser-modal.jsx';
import supportedBrowser from '../lib/supported-browser';
import styles from './index.css';

// 🧩 Decorador Vision Kit
import setupVisionKitDecorator from '../lib/vision-decorator';

/**
 * Inicializa la aplicación GUI principal de Scratch
 * y registra automáticamente las extensiones Vision Kit.
 */
const initializeApp = function () {
    // === Crear contenedor base
    const appTarget = document.createElement('div');
    appTarget.className = styles.app;
    document.body.appendChild(appTarget);

    // === Instancia global de VM
    const vm = new VM();
    window.Scratch = {vm};

    if (supportedBrowser()) {
        // === Renderizar GUI principal
        const renderGUI = require('./render-gui.jsx').default;
        renderGUI(appTarget, vm);

        // === Iniciar decorador Vision Kit
        setupVisionKitDecorator(); // <-- 🔹 SIN pasar vm
    } else {
        // === Mostrar aviso de navegador no soportado
        BrowserModalComponent.setAppElement(appTarget);
        const WrappedBrowserModalComponent = AppStateHOC(
            BrowserModalComponent,
            true /* localesOnly */
        );

        const props = {onBack: () => {}};
        ReactDOM.render(
            <WrappedBrowserModalComponent {...props} />,
            appTarget
        );
    }
};

// 🚀 Ejecutar inicialización principal
initializeApp();
