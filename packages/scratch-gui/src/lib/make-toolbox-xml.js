/* eslint-disable quote-props */
/* global ScratchBlocks */
import {defaultColors} from './themes';

const xmlOpen = '<xml style="display: none">';
const xmlClose = '</xml>';

/**
 * 🧱 Genera dinámicamente el XML del Toolbox para los bloques Vision.
 * Escanea todos los bloques de la VM que comiencen con "vision".
 */

const makeToolboxXML = function () {
    let visionBlocks = [];

    try {
        const vm = (window.Scratch && window.Scratch.vm) || window.vm;
        if (vm && vm.runtime && vm.runtime._primitives) {
            const allBlocks = Object.keys(vm.runtime._primitives);
            visionBlocks = allBlocks.filter(id => id.startsWith('vision'));
        }
    } catch (err) {
        console.warn('[VisionKit] No se pudo acceder al VM:', err);
    }

    if (!visionBlocks.length) {
        console.warn('[VisionKit] No se encontraron bloques Vision registrados.');
        setTimeout(() => window.dispatchEvent(new Event('refreshToolboxVision')), 1500);
    }

    const blockList = visionBlocks.length ? visionBlocks.map(id => `<block type="
        ${id}"></block>`).join('\n') : '<label text="Cargando bloques Vision..."></label>';

    const visionCategoryXML = `
        <category
            name="Vision Kit"
            id="vision"
            colour="${defaultColors.more.primary}"
            secondaryColour="${defaultColors.more.tertiary}">
            ${blockList}
        </category>
    `;

    return [xmlOpen, visionCategoryXML, xmlClose].join('\n');
};

// ============================================================
// 🔧 REGISTRO AUTOMÁTICO DE BLOQUES (anti-bloques rojos)
// ============================================================
if (typeof window !== 'undefined') {
    const defineAutoBlocks = () => {
        const vm = (window.Scratch && window.Scratch.vm) || window.vm;
        if (!vm || !vm.runtime || !vm.runtime._primitives || !window.ScratchBlocks) return;

        const blockIds = Object.keys(vm.runtime._primitives).filter(id =>
            id.startsWith('vision')
        );

        blockIds.forEach(id => {
            if (!ScratchBlocks.Blocks[id]) {
                ScratchBlocks.Blocks[id] = {
                    init () {
                        const label = id
                            .replace(/^vision_?/, '')
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

        console.log(`[✅ VisionKit] ${blockIds.length} bloques visuales listos.`);
    };

    // ⏳ Esperar a que VM y Blockly estén listas
    const waitForBlocks = setInterval(() => {
        const ready =
            window.ScratchBlocks &&
            ((window.Scratch && window.Scratch.vm) || window.vm);
        if (ready) {
            clearInterval(waitForBlocks);
            defineAutoBlocks();
        }
    }, 800);

    // 🔁 Refrescar toolbox Vision dinámicamente
    window.addEventListener('refreshToolboxVision', () => {
        console.log('[VisionKit] 🔁 Refrescando toolbox Vision...');
        const xml = makeToolboxXML();

        // Buscar el store Redux (3 posibles ubicaciones)
        const store =
            window.store ||
            (window.ScratchGUI && window.ScratchGUI.store) ||
            (window.__REDUX_DEVTOOLS_EXTENSION__ &&
                window.__REDUX_DEVTOOLS_EXTENSION__.store);

        if (store && store.dispatch) {
            store.dispatch({
                type: 'scratch-gui/toolbox/UPDATE_TOOLBOX',
                toolboxXML: xml
            });
            console.log('[VisionKit] 🧱 Toolbox Vision actualizado dinámicamente.');
        } else {
            console.warn('[VisionKit] ⚠️ No se encontró store Redux para actualizar toolbox.');
        }
    });
}

export default makeToolboxXML;
