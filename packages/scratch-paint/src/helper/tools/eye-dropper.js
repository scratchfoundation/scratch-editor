import paper from '@scratch/paper';
import {createCanvas, getRaster, getBackgroundGuideLayer} from '../layer';

const LOUPE_RADIUS = 20;
const ZOOM_SCALE = 3;

class EyeDropperTool extends paper.Tool {
    constructor (canvas, width, height, pixelRatio, zoom, offsetX, offsetY, isBitmap) {
        super();

        const layer = isBitmap ? getRaster().layer : paper.project.activeLayer;
        const contentRaster3x = layer.rasterize(
            72 * ZOOM_SCALE * paper.view.zoom, false /* insert */, paper.view.bounds);
        const backgroundRaster3x = getBackgroundGuideLayer().rasterize(
            72 * ZOOM_SCALE * paper.view.zoom, false /* insert */, paper.view.bounds);

        // Canvas from which loupe is cut, shows art and grid
        this.bufferCanvas = createCanvas(canvas.width * ZOOM_SCALE, canvas.height * ZOOM_SCALE);
        const bufferCanvasContext = this.bufferCanvas.getContext('2d');
        // Canvas to sample colors from; just the art
        this.colorCanvas = createCanvas(canvas.width * ZOOM_SCALE, canvas.height * ZOOM_SCALE);
        const colorCanvasContext = this.colorCanvas.getContext('2d');

        backgroundRaster3x.onLoad = () => {
            bufferCanvasContext.drawImage(backgroundRaster3x.canvas, 0, 0);
            contentRaster3x.onLoad = () => {
                colorCanvasContext.drawImage(contentRaster3x.canvas, 0, 0);
                bufferCanvasContext.drawImage(this.colorCanvas, 0, 0);
                this.bufferLoaded = true;
            };
            if (contentRaster3x.loaded) contentRaster3x.onLoad();
        };

        this.onMouseDown = this.handleMouseDown;
        this.onMouseUp = this.handleMouseUp;
        this.onMouseMove = this.handleMouseMove;

        this.canvas = canvas;
        this.pixelRatio = pixelRatio;
        this.zoom = zoom;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.width = width * this.zoom * this.pixelRatio;
        this.height = height * this.zoom * this.pixelRatio;
        this.rect = canvas.getBoundingClientRect();
        this.colorString = '';
        this.pickX = -1;
        this.pickY = -1;
        this.hideLoupe = true;
    }
    handleMouseMove (event) {
        // Set the pickX/Y for the color picker loop to pick up
        this.pickX = (event.point.x - this.offsetX) * this.zoom * this.pixelRatio;
        this.pickY = (event.point.y - this.offsetY) * this.zoom * this.pixelRatio;

        // check if the x/y are outside of the canvas
        this.hideLoupe = this.pickX > this.width ||
            this.pickX < 0 ||
            this.pickY > this.height ||
            this.pickY < 0;
    }
    handleMouseDown (event) {
        // Nothing special on mousedown, just send to move handler which will show the loupe,
        // and the mouse up handler submits the color. This allows touch to drag
        // with the loupe visible to find the correct color
        this.handleMouseMove(event);
    }
    handleMouseUp () {
        if (!this.hideLoupe) {
            const colorInfo = this.getColorInfo(this.pickX, this.pickY, this.hideLoupe);
            if (!colorInfo) return;
            if (colorInfo.color[3] === 0) {
                // Alpha 0
                this.colorString = null;
                return;
            }
            const r = colorInfo.color[0];
            const g = colorInfo.color[1];
            const b = colorInfo.color[2];

            // from https://github.com/LLK/scratch-gui/blob/77e54a80a31b6cd4684d4b2a70f1aeec671f229e/src/containers/stage.jsx#L218-L222
            // formats the color info from the canvas into hex for parsing by the color picker
            const componentToString = c => {
                const hex = c.toString(16);
                return hex.length === 1 ? `0${hex}` : hex;
            };
            this.colorString = `#${componentToString(r)}${componentToString(g)}${componentToString(b)}`;
        }
    }
    getColorInfo (x, y, hideLoupe) {
        const artX = x / this.pixelRatio;
        const artY = y / this.pixelRatio;
        if (!this.bufferLoaded) return null;
        const colorContext = this.colorCanvas.getContext('2d');
        const bufferContext = this.bufferCanvas.getContext('2d');
        const colors = colorContext.getImageData(artX * ZOOM_SCALE, artY * ZOOM_SCALE, 1, 1);
        return {
            x: x,
            y: y,
            color: colors.data,
            data: bufferContext.getImageData(
                ZOOM_SCALE * (artX - LOUPE_RADIUS),
                ZOOM_SCALE * (artY - LOUPE_RADIUS),
                LOUPE_RADIUS * 2 * ZOOM_SCALE,
                LOUPE_RADIUS * 2 * ZOOM_SCALE
            ).data,
            hideLoupe: hideLoupe
        };
    }
}

export {
    EyeDropperTool as default,
    LOUPE_RADIUS,
    ZOOM_SCALE
};
