const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');

class VisionBasic {
    constructor (runtime) {
        this.runtime = runtime;
        this.baseURL = 'http://127.0.0.1:8001';
    }

    // =========================================================
    // ✅ INFORMACIÓN DE LA EXTENSIÓN
    // =========================================================
    getInfo () {
        return {
            id: 'visionbasic',
            name: 'Vision Básico',
            color1: '#34D399',
            color2: '#059669',
            color3: '#064E3B',
            blocks: [
                {
                    opcode: 'visionbasic_brightness',
                    blockType: BlockType.COMMAND,
                    text: 'ajustar brillo [BETA]',
                    arguments: {
                        BETA: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 30
                        }
                    }
                },
                {
                    opcode: 'visionbasic_contrast',
                    blockType: BlockType.COMMAND,
                    text: 'ajustar contraste [ALPHA]',
                    arguments: {
                        ALPHA: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1.2
                        }
                    }
                },
                {
                    opcode: 'visionbasic_invert',
                    blockType: BlockType.COMMAND,
                    text: 'invertir colores'
                },
                {
                    opcode: 'visionbasic_pixelate',
                    blockType: BlockType.COMMAND,
                    text: 'pixelar imagen [F]',
                    arguments: {
                        F: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 8
                        }
                    }
                },
                {
                    opcode: 'visionbasic_circles',
                    blockType: BlockType.COMMAND,
                    text: 'detectar círculos'
                },
                {
                    opcode: 'visionbasic_rectangles',
                    blockType: BlockType.COMMAND,
                    text: 'detectar rectángulos'
                }
            ],
            menus: {}
        };
    }

    // =========================================================
    // ✅ REGISTRO DE PRIMITIVAS (IMPORTANTE)
    // =========================================================
    getPrimitives () {
        return {
            visionbasic_brightness: this.brightness.bind(this),
            visionbasic_contrast: this.contrast.bind(this),
            visionbasic_invert: this.invert.bind(this),
            visionbasic_pixelate: this.pixelate.bind(this),
            visionbasic_circles: this.circles.bind(this),
            visionbasic_rectangles: this.rectangles.bind(this)
        };
    }

    // =========================================================
    // 🔧 FUNCIÓN BASE DE COMUNICACIÓN CON BACKEND
    // =========================================================
    async _call (op, params = {}) {
        try {
            const resp = await fetch(`${this.baseURL}/process`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({op, params})
            });

            if (!resp.ok) {
                console.error(`[VisionBasic] Error HTTP ${resp.status}`);
                return;
            }

            const data = await resp.json();
            if (data.image_b64) {
                this.runtime.emit('VISION_IMAGE', data.image_b64);
            } else {
                console.warn('[VisionBasic] No se recibió imagen en respuesta.');
            }
        } catch (err) {
            console.error('[VisionBasic] Error en conexión con backend:', err);
        }
    }

    // =========================================================
    // 🧩 IMPLEMENTACIONES DE BLOQUES
    // =========================================================
    brightness (args) {
        return this._call('brightness', {beta: args.BETA});
    }

    contrast (args) {
        return this._call('contrast', {alpha: args.ALPHA});
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
}

// =========================================================
// ✅ EXPORTACIÓN FORMAL
// =========================================================
module.exports = function (runtime) {
    return new VisionBasic(runtime);
};
