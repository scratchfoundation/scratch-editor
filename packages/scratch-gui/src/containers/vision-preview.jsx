import React from 'react';
import PropTypes from 'prop-types';
import VisionPreview from '../components/vision-preview/vision-preview';

/**
 * Contenedor del componente VisionPreview.
 * Renderiza la vista previa del Vision Kit y recibe la instancia de VM como prop.
 *
 * @component
 * @param {object} props - Propiedades del componente
 * @param {object} props.vm - Instancia de scratch-vm que maneja la lógica del proyecto
 * @returns {JSX.Element} El componente VisionPreview con la prop vm
 */
const VisionPreviewContainer = ({vm}) => (
    <VisionPreview vm={vm} />
);

VisionPreviewContainer.propTypes = {
    vm: PropTypes.object.isRequired
};

export default VisionPreviewContainer;
