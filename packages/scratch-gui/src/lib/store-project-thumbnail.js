import log from './log';
import layout from './layout-constants';

const {standardStageWidth: THUMBNAIL_WIDTH, standardStageHeight: THUMBNAIL_HEIGHT} = layout;

/*
 * The renderer's canvas is sized for the stage as it is currently displayed and is multiplied by the
 * device pixel ratio, so it is redrawn at a fixed size to keep stored thumbnails consistent between
 * stage size modes and between displays.
 *
 * The renderer canvas must be read from within the snapshot callback, which the renderer fires
 * immediately after drawing and before the browser discards the WebGL drawing buffer.
 */
export const getProjectThumbnail = (vm, callback) => {
    vm.postIOData('video', {forceTransparentPreview: true});
    vm.renderer.requestSnapshot(() => {
        vm.postIOData('video', {forceTransparentPreview: false});

        const canvas = document.createElement('canvas');
        canvas.width = THUMBNAIL_WIDTH;
        canvas.height = THUMBNAIL_HEIGHT;
        canvas.getContext('2d').drawImage(vm.renderer.canvas, 0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);

        callback(canvas.toDataURL());
    });
    vm.renderer.draw();
};

// As above, but reports capture failures to `onError` instead of throwing.
export const storeProjectThumbnail = (vm, callback, onError) => {
    try {
        getProjectThumbnail(vm, callback);
    } catch (e) {
        log.error('Project thumbnail save error', e);
        onError?.(e);
    }
};
