import React, {useEffect, useRef} from 'react';
import PropTypes from 'prop-types';

/**
 * VisionViewer - canvas que escucha el evento "VISION_IMAGE"
 * emitido desde la extensión Vision y lo renderiza.
 *
 * @component
 * @param {object} props - Las propiedades del componente.
 * @param {object} props.runtime - Instancia del runtime de Scratch VM.
 * @returns {JSX.Element} Un canvas que muestra la imagen procesada.
 */
const VisionViewer = ({runtime}) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const handler = dataURL => {
            const ctx = canvasRef.current.getContext('2d');
            const img = new Image();
            img.onload = () => {
                canvasRef.current.width = img.width;
                canvasRef.current.height = img.height;
                ctx.clearRect(0, 0, img.width, img.height);
                ctx.drawImage(img, 0, 0);
            };
            img.src = dataURL;
        };

        runtime.on('VISION_IMAGE', handler);
        return () => runtime.off('VISION_IMAGE', handler);
    }, [runtime]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                border: '1px solid #ccc',
                width: '100%',
                height: '100%',
                background: '#f9f9f9'
            }}
        />
    );
};

VisionViewer.propTypes = {
    runtime: PropTypes.shape({
        on: PropTypes.func.isRequired,
        off: PropTypes.func.isRequired
    }).isRequired
};

export default VisionViewer;
