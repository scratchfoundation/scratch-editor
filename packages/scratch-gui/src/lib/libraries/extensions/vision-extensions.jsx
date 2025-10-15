import React from 'react';
import {FormattedMessage} from 'react-intl';
import visionIconURL from './vision/vision.png';

export default [
    {
        name: 'Vision Acciones',
        extensionId: 'visionactions',
        iconURL: visionIconURL,
        insetIconURL: visionIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Carga, visualización y exportación de imágenes."
                id="gui.extension.visionactions.description"
            />
        ),
        featured: true,
        collaborator: 'OpenCV + Scratch EDU',
        tags: ['visión', 'imagen', 'acciones']
    },
    {
        name: 'Vision Básico',
        extensionId: 'visionbasic',
        iconURL: visionIconURL,
        insetIconURL: visionIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Filtros de color y operaciones simples."
                id="gui.extension.visionbasic.description"
            />
        ),
        featured: true,
        collaborator: 'OpenCV + Scratch EDU',
        tags: ['visión', 'imagen', 'básico']
    },
    {
        name: 'Vision Intermedio',
        extensionId: 'visionintermediate',
        iconURL: visionIconURL,
        insetIconURL: visionIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Detección de bordes y transformaciones geométricas."
                id="gui.extension.visionintermediate.description"
            />
        ),
        featured: true,
        collaborator: 'OpenCV + Scratch EDU',
        tags: ['visión', 'imagen', 'intermedio']
    },
    {
        name: 'Vision Avanzado',
        extensionId: 'visionadvanced',
        iconURL: visionIconURL,
        insetIconURL: visionIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Segmentación y extracción de características avanzadas."
                id="gui.extension.visionadvanced.description"
            />
        ),
        featured: true,
        collaborator: 'OpenCV + Scratch EDU',
        tags: ['visión', 'imagen', 'avanzado']
    }
];
