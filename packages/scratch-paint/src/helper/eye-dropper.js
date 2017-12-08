import paper from '@scratch/paper';

const PAPER_WIDTH = 864;
const PAPER_HEIGHT = 648;
const LOUPE_RADIUS = 20;
const CANVAS_SCALE = 1.8;

class EyeDropperTool extends paper.Tool {
    constructor (canvas) {
        super();

        this.onMouseDown = this.handleMouseDown;
        this.onMouseMove = this.handleMouseMove;

        this.active = false;
        this.canvas = canvas;
        this.colorInfo = null;
        this.rect = canvas.getBoundingClientRect();
        this.colorString = '';
    }
    handleMouseMove (event) {
        // Set the pickX/Y for the color picker loop to pick up
        this.pickX = event.point.x * CANVAS_SCALE;
        this.pickY = event.point.y * CANVAS_SCALE;

        // check if the x/y are outside of the canvas
        this.hideLoupe = this.pickX > PAPER_WIDTH ||
            this.pickX < 0 ||
            this.pickY > PAPER_HEIGHT ||
            this.pickY < 0;
    }
    handleMouseDown () {
        if (!this.hideLoupe) {
            const colorInfo = this.getColorInfo(this.pickX, this.pickY, this.hideLoupe);
            const r = colorInfo.color[0];
            const g = colorInfo.color[1];
            const b = colorInfo.color[2];

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
    PAPER_HEIGHT,
    PAPER_WIDTH,
    LOUPE_RADIUS,
    CANVAS_SCALE
};
