import paper from '@scratch/paper';

const LOUPE_RADIUS = 20;

class EyeDropperTool extends paper.Tool {
    constructor (canvas, width, height, pixelRatio, zoom, offsetX, offsetY) {
        super();

        this.onMouseDown = this.handleMouseDown;
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

        /*
            Chrome 64 has a bug that makes it impossible to use getImageData directly
            a 2d canvas. Until that is resolved, copy the canvas to a buffer canvas
            and read the data from there.
            https://github.com/LLK/scratch-paint/issues/276
        */
        this.bufferLoaded = false;
        this.bufferCanvas = document.createElement('canvas');
        this.bufferCanvas.width = canvas.width;
        this.bufferCanvas.height = canvas.height;
        this.bufferImage = new Image();
        this.bufferImage.onload = () => {
            this.bufferCanvas.getContext('2d').drawImage(this.bufferImage, 0, 0);
            this.bufferLoaded = true;
        };
        this.bufferImage.src = canvas.toDataURL();
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
    handleMouseDown () {
        if (!this.hideLoupe) {
            const colorInfo = this.getColorInfo(this.pickX, this.pickY, this.hideLoupe);
            if (!colorInfo) return;
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
        if (!this.bufferLoaded) return null;
        const ctx = this.bufferCanvas.getContext('2d');
        const colors = ctx.getImageData(x, y, 1, 1);
        return {
            x: x,
            y: y,
            color: colors.data,
            data: ctx.getImageData(
                x - LOUPE_RADIUS,
                y - LOUPE_RADIUS,
                LOUPE_RADIUS * 2,
                LOUPE_RADIUS * 2
            ).data,
            hideLoupe: hideLoupe
        };
    }
}

export {
    EyeDropperTool as default,
    LOUPE_RADIUS
};
