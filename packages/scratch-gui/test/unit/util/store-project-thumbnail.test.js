import {getProjectThumbnail, storeProjectThumbnail} from '../../../src/lib/store-project-thumbnail';
import log from '../../../src/lib/log';

describe('store-project-thumbnail', () => {
    const THUMBNAIL_URI = 'data:image/png;base64,thumbnail';

    let drawImage;
    let getContext;

    // Build a VM whose renderer registers a snapshot callback and invokes it on draw, like RenderWebGL does.
    // Its canvas is deliberately larger than a thumbnail, as it would be on a high-DPI display.
    const makeVM = () => {
        const rendererCanvas = document.createElement('canvas');
        rendererCanvas.width = 1200;
        rendererCanvas.height = 900;

        const snapshotCallbacks = [];
        return {
            postIOData: jest.fn(),
            renderer: {
                canvas: rendererCanvas,
                requestSnapshot: jest.fn(cb => snapshotCallbacks.push(cb)),
                draw: jest.fn(() => snapshotCallbacks.splice(0).forEach(cb => cb()))
            }
        };
    };

    beforeEach(() => {
        drawImage = jest.fn();
        // jsdom has no 2d context, so the canvas the thumbnail is drawn into has to be stubbed.
        getContext = jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({drawImage});
        jest.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(THUMBNAIL_URI);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('redraws the renderer canvas at a fixed size', () => {
        const vm = makeVM();
        const callback = jest.fn();

        getProjectThumbnail(vm, callback);

        const thumbnailCanvas = getContext.mock.instances[0];
        expect([thumbnailCanvas.width, thumbnailCanvas.height]).toEqual([480, 360]);
        expect(drawImage).toHaveBeenCalledWith(vm.renderer.canvas, 0, 0, 480, 360);
        expect(callback).toHaveBeenCalledWith(THUMBNAIL_URI);
    });

    test('restores the video preview before capturing', () => {
        const vm = makeVM();

        getProjectThumbnail(vm, jest.fn());

        expect(vm.postIOData.mock.calls).toEqual([
            ['video', {forceTransparentPreview: true}],
            ['video', {forceTransparentPreview: false}]
        ]);
    });

    test('storeProjectThumbnail logs and reports a failed capture instead of throwing', () => {
        const logError = jest.spyOn(log, 'error').mockImplementation(() => {});
        const onError = jest.fn();
        const vm = makeVM();
        vm.renderer.draw = () => {
            throw new Error('renderer exploded');
        };

        storeProjectThumbnail(vm, jest.fn(), onError);

        expect(logError).toHaveBeenCalled();
        expect(onError).toHaveBeenCalled();
    });
});
