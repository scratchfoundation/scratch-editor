import {useEffect} from 'react';
import PropTypes from 'prop-types';
import VM from '@scratch/scratch-vm';


const VisionStageInjector = ({vm}) => {
    useEffect(() => {
        if (!vm || !vm.runtime) return;

        const handler = async dataUrl => {
            try {
                // Pasamos de dataURL -> Blob -> File (lo que espera el VM)
                const res = await fetch(dataUrl);
                const blob = await res.blob();
                const file = new File([blob], 'vision-result.png', {type: blob.type || 'image/png'});

                // Sube el fondo y (normalmente) lo activa como backdrop actual
                await vm.addBackdropFromFile(file);

                // Nota:
                // vm.addBackdropFromFile suele cambiar al nuevo fondo automáticamente.
                // Si tu build no lo hace, dime y te paso la línea para forzar el cambio.
            } catch (e) {
                // No rompas la UI si algo falla; solo log.
                // eslint-disable-next-line no-console
                console.error('VisionStageInjector error:', e);
            }
        };

        vm.runtime.on('VISION_IMAGE', handler);
        return () => vm.runtime.off('VISION_IMAGE', handler);
    }, [vm]);

    // No renderiza nada visible
    return null;
};

VisionStageInjector.propTypes = {
    vm: PropTypes.instanceOf(VM).isRequired
};

export default VisionStageInjector;
