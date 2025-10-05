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
        featured: true
    }
];
