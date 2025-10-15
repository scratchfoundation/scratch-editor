/**
 * Registro manual de extensiones Vision en la VM.
 *
 * @param {object} vm - Instancia de la máquina virtual de Scratch (Scratch VM)
 */
export default function registerVisionExtensions (vm) {
    try {
        // ✅ Rutas corregidas (sube 5 niveles desde scratch-gui/src/lib)
        const modules = {
            visionactions: require('scratch-vm/src/extensions/vision-actions'),
            visionbasic: require('scratch-vm/src/extensions/vision-basic'),
            visionintermediate: require('scratch-vm/src/extensions/vision-intermediate'),
            visionadvanced: require('scratch-vm/src/extensions/vision-advanced')
        };

        Object.entries(modules).forEach(([id, factory]) => {
            try {
                const extensionInstance = factory(vm.runtime);
                vm.extensionManager._loadedExtensions[id] = extensionInstance;

                const primitives = extensionInstance.getPrimitives();
                Object.assign(vm.runtime._primitives, primitives);

                console.log(`🧩 [VisionKit] Registrada extensión interna:
                    ${id} (${Object.keys(primitives).length} bloques).`);
            } catch (err) {
                console.warn(`⚠️ [VisionKit] Error registrando extensión ${id}:`, err);
            }
        });

        console.log('✅ [VisionKit] Todas las extensiones Vision registradas manualmente.');
    } catch (err) {
        console.error('❌ [VisionKit] Falló el registro manual de extensiones:', err);
    }
}
