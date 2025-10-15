const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');

class VisionIntermediate {
    constructor (runtime) {
        this.runtime = runtime;
        this.baseURL = 'http://127.0.0.1:8001';
    }

    // =========================================================
    // ✅ INFORMACIÓN DE LA EXTENSIÓN (con prefijos correctos)
    // =========================================================
    getInfo () {
        return {
            id: 'visionintermediate',
            name: 'Vision Intermedio',
            color1: '#FACC15',
            color2: '#CA8A04',
            color3: '#854D0E',
            blocks: [
                {
                    opcode: 'visionintermediate_edges',
                    blockType: BlockType.COMMAND,
                    text: 'detectar bordes (Canny)'
                },
                {
                    opcode: 'visionintermediate_gray',
                    blockType: BlockType.COMMAND,
                    text: 'convertir a escala de grises'
                },
                {
                    opcode: 'visionintermediate_gaussian',
                    blockType: BlockType.COMMAND,
                    text: 'aplicar filtro gaussiano'
                },
                {
                    opcode: 'visionintermediate_rotate',
                    blockType: BlockType.COMMAND,
                    text: 'rotar imagen [ANGLE]',
                    arguments: {
                        ANGLE: {type: ArgumentType.NUMBER, defaultValue: 90}
                    }
                },
                {
                    opcode: 'visionintermediate_resize',
                    blockType: BlockType.COMMAND,
                    text: 'redimensionar a [W]x[H]',
                    arguments: {
                        W: {type: ArgumentType.NUMBER, defaultValue: 320},
                        H: {type: ArgumentType.NUMBER, defaultValue: 240}
                    }
                }
            ],
            menus: {} // requerido por el formato Scratch
        };
    }

    // =========================================================
    // ✅ REGISTRO DE PRIMITIVAS CON PREFIJO COMPLETO
    // =========================================================
    getPrimitives () {
        return {
            visionintermediate_edges: this.edges.bind(this),
            visionintermediate_gray: this.gray.bind(this),
            visionintermediate_gaussian: this.gaussian.bind(this),
            visionintermediate_rotate: this.rotate.bind(this),
            visionintermediate_resize: this.resize.bind(this)
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
                console.error(`[VisionIntermediate] Error HTTP ${resp.status}`);
                return;
            }

            const data = await resp.json();
            if (data.image_b64) {
                this.runtime.emit('VISION_IMAGE', data.image_b64);
            } else {
                console.warn('[VisionIntermediate] No se recibió imagen en respuesta.');
            }
        } catch (err) {
            console.error('[VisionIntermediate] Error en conexión con backend:', err);
        }
    }

    // =========================================================
    // 🧩 IMPLEMENTACIONES DE BLOQUES
    // =========================================================
    edges () {
        return this._call('edges');
    }

    gray () {
        return this._call('gray');
    }

    gaussian () {
        return this._call('gaussian');
    }

    rotate (args) {
        return this._call('rotate', {angle: args.ANGLE});
    }

    resize (args) {
        return this._call('resize', {w: args.W, h: args.H});
    }
}

// =========================================================
// ✅ EXPORTACIÓN FORMAL PARA SCRATCH VM
// =========================================================
module.exports = function (runtime) {
    return new VisionIntermediate(runtime);
};
