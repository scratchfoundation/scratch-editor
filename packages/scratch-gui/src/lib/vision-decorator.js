/**
 * 🎨 VisionKit Decorator
 * Registra las extensiones Vision y actualiza el toolbox dinámicamente.
 */

const decorateVisionToolbox = function (vm, gui) {
    console.log('🟢 [VisionKit] Decorador iniciado, esperando VM...');
    const waitForVM = setInterval(() => {
        if (window.vm && window.vm.runtime && window.vm.extensionManager) {
            clearInterval(waitForVM);
            console.log('⚙️ [VisionKit] VM detectada, registrando extensiones...');
            registerExtensions(window.vm, gui);
        }
    }, 800);
};

/**
 * 🔧 Registra las extensiones Vision dentro de la VM y actualiza la GUI.
 */

const registerExtensions = function (vm, gui) {
    try {
        const modules = {
            visionactions: require('scratch-vm/src/extensions/vision-actions'),
            visionbasic: require('scratch-vm/src/extensions/vision-basic'),
            visionintermediate: require('scratch-vm/src/extensions/vision-intermediate'),
            visionadvanced: require('scratch-vm/src/extensions/vision-advanced')
        };

        // 🔹 Registrar extensiones si no lo están aún
        Object.entries(modules).forEach(([id, mod]) => {
            if (!vm.extensionManager.isExtensionLoaded(id)) {
                vm.extensionManager._registerInternalExtension(mod);
                console.log(`🧩 [VisionKit] Registrada extensión interna: ${id}`);
            }
        });

        // 🔹 Esperar hasta que existan los bloques
        const waitBlocks = setInterval(() => {
            const primitives = Object.keys(vm.runtime._primitives || {}).filter(k =>
                k.includes('vision')
            );
            if (primitives.length > 0) {
                clearInterval(waitBlocks);
                console.log(`🎨 [VisionKit] Primitivos Vision detectados: ${primitives.length}`);

                // 🔁 Actualizar toolbox
                if (gui?.props?.vm?.extensionManager) {
                    gui.props.vm.extensionManager.refreshBlocks();
                    console.log('🧱 [VisionKit] refreshBlocks ejecutado correctamente.');
                }

                if (gui?.props?.updateToolbox) {
                    gui.props.updateToolbox();
                    console.log('🎨 [VisionKit] Toolbox actualizado desde VisionKit.');
                } else {
                    vm.runtime.emit('EXTENSIONS_UPDATED');
                    console.log('🎨 [VisionKit] Toolbox actualizado (evento fallback).');
                }

                // 🚀 Disparar evento para actualizar XML dinámico
                window.dispatchEvent(new Event('refreshToolboxVision'));
            }
        }, 1000);

        console.log('✅ [VisionKit] Todas las extensiones Vision registradas manualmente.');
    } catch (err) {
        console.error('❌ [VisionKit] Error al registrar extensiones Vision:', err);
    }
};

export default decorateVisionToolbox;
