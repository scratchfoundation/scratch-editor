import React from 'react';
import {FormattedMessage} from 'react-intl';

// 👁️ Nuevo icono para Vision Kit
import visionIconURL from './vision/vision.png';

export default [
    {
        name: 'Vision Kit',
        extensionId: 'vision',
        iconURL: visionIconURL,
        insetIconURL: visionIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Filtros de color, bordes y visión por computadora."
                description="Description for the Vision Kit extension"
                id="gui.extension.vision.description"
            />
        ),
        featured: true,

        // 👇 NUEVO: metadatos visuales para dividir categorías dentro de Vision Kit
        collaborator: 'OpenCV + Scratch EDU',
        tags: ['visión', 'imagen', 'procesamiento'],

        // 👇 NUEVO: definición de subcategorías (niveles)
        categories: [
            {name: '🧩 Acciones', color: '#2DD4BF'},
            {name: '💡 Nivel Básico', color: '#34D399'},
            {name: '⚙️ Nivel Intermedio', color: '#FACC15'},
            {name: '🚀 Nivel Avanzado', color: '#A78BFA'}
        ]
    }
];
