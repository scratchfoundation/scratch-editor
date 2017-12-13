import paper from '@scratch/paper';

const LOUPE_RADIUS = 20;

class EyeDropperTool extends paper.Tool {
    constructor (canvas, width, height, pixelRatio) {
        super();

        this.onMouseDown = this.handleMouseDown;
        this.onMouseMove = this.handleMouseMove;

        this.canvas = canvas;
        this.pixelRatio = pixelRatio;
        this.width = width * this.pixelRatio;
        this.height = height * this.pixelRatio;
        this.rect = canvas.getBoundingClientRect();
        this.colorString = '';
    }
    handleMouseMove (event) {
        // Set the pickX/Y for the color picker loop to pick up
        this.pickX = event.point.x * this.pixelRatio;
        this.pickY = event.point.y * this.pixelRatio;

        // check if the x/y are outside of the canvas
        this.hideLoupe = this.pickX > this.width ||
            this.pickX < 0 ||
            this.pickY > this.height ||
            this.pickY < 0;
    }
    handleMouseDown () {
        if (!this.hideLoupe) {
            const colorInfo = this.getColorInfo(this.pickX, this.pickY, this.hideLoupe);
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
        const c = this.canvas.getContext('2d');
        const colors = c.getImageData(x, y, 1, 1);

        return {
            x: x,
            y: y,
            color: colors.data,
            data: c.getImageData(
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
