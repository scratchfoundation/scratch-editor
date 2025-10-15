/* eslint-disable quote-props */
/* global ScratchBlocks */

/**
 * Registro automático de bloques Vision en ScratchBlocks.
 * Evita los “bloques rojos” y garantiza que se dibujen correctamente.
 */
export default function registerVisionBlocks () {
    const waitForEnvironment = setInterval(() => {
        // Verificamos que el entorno esté completamente cargado
        if (!window.ScratchBlocks || !window.Scratch?.vm?.runtime?._primitives) return;

        clearInterval(waitForEnvironment);

        const primitives = window.Scratch.vm.runtime._primitives;
        const visionIds = Object.keys(primitives).filter(k => k.startsWith('vision'));

        visionIds.forEach(id => {
            if (!ScratchBlocks.Blocks[id]) {
                ScratchBlocks.Blocks[id] = {
                    init: function () {
                        const label = id
                            .replace(/vision[a-z]*/, '')
                            .replace(/_/g, ' ')
                            .trim();

                        this.jsonInit({
                            type: id,
                            message0: label || id,
                            previousStatement: null,
                            nextStatement: null,
                            colour: '#0E7490',
                            tooltip: id,
                            helpUrl: ''
                        });
                    }
                };
            }
        });

        console.log(`[VisionKit] ✅ ${visionIds.length} bloques registrados en ScratchBlocks`);
    }, 1000);
}
