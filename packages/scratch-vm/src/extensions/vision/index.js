const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');

class Vision {
    constructor (runtime) {
        this.runtime = runtime;
        this.serverUrl = 'http://127.0.0.1:8001';
        this.lastDataURL = null;
        this.prevFrame = null; // para optical flow (futuro)
    }
    getInfo () {
        return {
            id: 'vision',
            name: 'Vision Kit',
            color1: '#34D399',
            color2: '#059669',
            blocks: [
                {
                    opcode: 'setImageURL',
                    blockType: BlockType.COMMAND,
                    text: 'cargar imagen desde URL [URL]',
                    arguments: {
                        URL: {type: ArgumentType.STRING, defaultValue: 'https://picsum.photos/480/360'}
                    }
                },
                // ----- Nivel Básico -----
                {
                    opcode: 'brightness',
                    blockType: BlockType.COMMAND,
                    text: 'brillo [BETA]',
                    arguments: {BETA: {type: ArgumentType.NUMBER, defaultValue: 30}}
                },
                {
                    opcode: 'contrast',
                    blockType: BlockType.COMMAND,
                    text: 'contraste [ALPHA]',
                    arguments: {ALPHA: {type: ArgumentType.NUMBER, defaultValue: 1.2}}
                },
                {
                    opcode: 'saturation',
                    blockType: BlockType.COMMAND,
                    text: 'saturación [S]',
                    arguments: {S: {type: ArgumentType.NUMBER, defaultValue: 1.3}}
                },
                {opcode: 'invert', blockType: BlockType.COMMAND, text: 'invertir colores'},
                {
                    opcode: 'pixelate',
                    blockType: BlockType.COMMAND,
                    text: 'pixelar factor [F]',
                    arguments: {F: {type: ArgumentType.NUMBER, defaultValue: 8}}
                },
                {opcode: 'circles', blockType: BlockType.COMMAND, text: 'detectar círculos'},
                {opcode: 'rectangles', blockType: BlockType.COMMAND, text: 'detectar rectángulos'},

                // ----- Intermedio -----
                {
                    opcode: 'canny',
                    blockType: BlockType.COMMAND,
                    text: 'bordes Canny [T1] [T2]',
                    arguments: {
                        T1: {type: ArgumentType.NUMBER, defaultValue: 100},
                        T2: {type: ArgumentType.NUMBER, defaultValue: 200}
                    }
                },
                {opcode: 'sobel', blockType: BlockType.COMMAND, text: 'bordes Sobel'},
                {
                    opcode: 'gaussian',
                    blockType: BlockType.COMMAND,
                    text: 'gaussian blur [K]',
                    arguments: {K: {type: ArgumentType.NUMBER, defaultValue: 5}}
                },
                {opcode: 'sharpen', blockType: BlockType.COMMAND, text: 'sharpen'},
                {opcode: 'contours', blockType: BlockType.COMMAND, text: 'contornos'},
                {
                    opcode: 'rotate',
                    blockType: BlockType.COMMAND,
                    text: 'rotar [DEG]',
                    arguments: {DEG: {type: ArgumentType.NUMBER, defaultValue: 15}}
                },
                {
                    opcode: 'scale',
                    blockType: BlockType.COMMAND,
                    text: 'escalar [S]',
                    arguments: {S: {type: ArgumentType.NUMBER, defaultValue: 1.2}}
                },
                {
                    opcode: 'translate',
                    blockType: BlockType.COMMAND,
                    text: 'trasladar [DX] [DY]',
                    arguments: {
                        DX: {type: ArgumentType.NUMBER, defaultValue: 20},
                        DY: {type: ArgumentType.NUMBER, defaultValue: 20}
                    }
                },

                // ----- Avanzado -----
                {opcode: 'orb', blockType: BlockType.COMMAND, text: 'características ORB'},
                {opcode: 'watershed', blockType: BlockType.COMMAND, text: 'segmentación Watershed'},
                {
                    opcode: 'kmeans',
                    blockType: BlockType.COMMAND,
                    text: 'segmentación K-means [K]',
                    arguments: {K: {type: ArgumentType.NUMBER, defaultValue: 3}}
                },

                // Utilidad
                {opcode: 'show', blockType: BlockType.COMMAND, text: 'mostrar resultado'}
            ]
        };
    }

    setServer (args) {
        this.baseURL = args.URL;
    }

    async setImageURL (args) {
        const res = await fetch(args.URL);
        const blob = await res.blob();
        this.lastDataURL = await new Promise(r => {
            const fr = new FileReader();
            fr.onload = () => r(fr.result);
            fr.readAsDataURL(blob);
        });
        this.runtime.emit('VISION_IMAGE', this.lastDataURL);
    }

    async _call (op, params = {}) {
        if (!this.lastDataURL) throw new Error('Primero usa "cargar imagen desde URL".');
        const body = {image_b64: this.lastDataURL, op, params};
        const resp = await fetch(`${this.baseURL}/process`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(body)
        });
        const data = await resp.json();
        if (data.image_b64) {
            this.lastDataURL = data.image_b64;
            this.runtime.emit('VISION_IMAGE', this.lastDataURL);
        }


    }

    // ----- Básico -----
    brightness (args) {
        return this._call('brightness', {beta: args.BETA});
    }
    contrast (args) {
        return this._call('contrast', {alpha: args.ALPHA});
    }
    saturation (args) {
        return this._call('saturation', {s: args.S});
    }
    invert () {
        return this._call('invert');
    }
    pixelate (args) {
        return this._call('pixelate', {factor: args.F});
    }
    circles () {
        return this._call('circles');
    }
    rectangles () {
        return this._call('rectangles');
    }

    // ----- Intermedio -----
    canny (args) {
        return this._call('canny', {t1: args.T1, t2: args.T2});
    }
    sobel () {
        return this._call('sobel');
    }
    gaussian (args) {
        return this._call('gaussian', {k: args.K});
    }
    sharpen () {
        return this._call('sharpen');
    }
    contours () {
        return this._call('contours');
    }
    rotate (args) {
        return this._call('rotate', {deg: args.DEG});
    }
    scale (args) {
        return this._call('scale', {s: args.S});
    }
    translate (args) {
        return this._call('translate', {dx: args.DX, dy: args.DY});
    }

    // ----- Avanzado -----
    orb () {
        return this._call('orb');
    }
    watershed () {
        return this._call('watershed');
    }
    kmeans (args) {
        return this._call('kmeans', {K: args.K});
    }

    show () {
        if (this.lastDataURL) this.runtime.emit('VISION_IMAGE', this.lastDataURL);
    }
}

module.exports = Vision;
