import {defaultColors} from './themes';

const xmlOpen = '<xml style="display: none">';
const xmlClose = '</xml>';

/**
 * Genera el XML del toolbox para el editor de bloques.
 * En esta versión solo se muestra la categoría “Vision Kit”.
 *
 * @param {!boolean} _isInitialSetup - Indica si el entorno está en configuración inicial.
 * @param {?boolean} _isStage - Indica si el objetivo actual es un escenario (Stage).
 * @param {?string} _targetId - ID del objetivo actual que edita el usuario.
 * @param {?Array.<{id:string, xml:string}>} categoriesXML - Lista de categorías y extensiones registradas.
 * @returns {string} XML final del toolbox con solo Vision Kit.
 */
const makeToolboxXML = function (
    _isInitialSetup,
    _isStage, // 🔹 Ya no le asignamos valor por defecto, así ESLint no se queja
    _targetId,
    categoriesXML = []
) {
    // Copia el array de categorías para evitar modificar el original
    categoriesXML = categoriesXML.slice();

    // Busca la categoría Vision Kit
    const visionCategory = categoriesXML.find(c => c.id === 'vision');

    // Si aún no se ha cargado, crea una categoría placeholder vacía
    const visionPlaceholder = `
        <category
            name="Vision Kit"
            id="vision"
            colour="${defaultColors.more.primary}"
            secondaryColour="${defaultColors.more.tertiary}">
        </category>
    `;

    // Solo dejamos Vision Kit y eliminamos el resto
    const xml = [
        xmlOpen,
        visionCategory ? visionCategory.xml : visionPlaceholder,
        xmlClose
    ];

    return xml.join('\n');
};

export default makeToolboxXML;
