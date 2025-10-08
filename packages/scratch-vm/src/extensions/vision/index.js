const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');

class Vision {
    constructor (runtime) {
        this.runtime = runtime;
        this.baseURL = 'http://127.0.0.1:8001';
        this.lastDataURL = null;
        this.prevFrame = null; // para optical flow (futuro)
    }
    /**
     * Muestra una alerta visual en la interfaz de Blockly/Scratch.
     * @param {string} message - Texto a mostrar al usuario.
     */
    _showAlert (message) {
        const existingAlert = document.getElementById('vision-alert');
        if (existingAlert) existingAlert.remove();

        const alert = document.createElement('div');
        alert.id = 'vision-alert';
        alert.textContent = message;
        Object.assign(alert.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: '#ff6b6b',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '10px',
            fontFamily: 'sans-serif',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            zIndex: 9999,
            transition: 'opacity 0.5s',
            opacity: '1'
        });

        document.body.appendChild(alert);
        setTimeout(() => {
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 500);
        }, 3000);
    }

    /**
     * Muestra un mensaje de confirmación (verde, estilo moderno).
     * @param {string} message - Texto a mostrar al usuario.
     */
    _showConfirm (message) {
        const existing = document.getElementById('vision-confirm');
        if (existing) existing.remove();

        const box = document.createElement('div');
        box.id = 'vision-confirm';
        box.innerHTML = `✅ ${message}`;

        Object.assign(box.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: '#16a34a', // Verde de confirmación
            color: 'white',
            padding: '10px 20px',
            borderRadius: '12px',
            fontFamily: 'sans-serif',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            fontSize: '15px',
            zIndex: 9999,
            opacity: '0',
            transform: 'translateY(10px)',
            transition: 'all 0.4s ease'
        });

        document.body.appendChild(box);

        // Animación de aparición
        requestAnimationFrame(() => {
            box.style.opacity = '1';
            box.style.transform = 'translateY(0)';
        });

        // Desaparece después de 3 segundos
        setTimeout(() => {
            box.style.opacity = '0';
            box.style.transform = 'translateY(10px)';
            setTimeout(() => box.remove(), 400);
        }, 3000);
    }

    getInfo () {
        return {
            id: 'vision',
            name: 'Vision Kit',
            color1: '#2DD4BF',
            color2: '#0E7490',

            // 🔹 Aquí definimos subcategorías (niveles)
            menus: {},

            // 🔹 Los bloques se agrupan en categorías por color
            blocks: [

                // ======== 🧩 ACCIONES ========
                {
                    opcode: 'setImageURL',
                    blockType: BlockType.COMMAND,
                    text: 'cargar imagen desde URL [URL]',
                    arguments: {
                        URL: {type: ArgumentType.STRING, defaultValue: 'https://picsum.photos/480/360'}
                    },
                    color1: '#2DD4BF'
                },
                {
                    opcode: 'setImageFile',
                    blockType: BlockType.COMMAND,
                    text: 'cargar imagen desde archivo local',
                    color1: '#2DD4BF'
                },
                {
                    opcode: 'exportProcessedImage',
                    blockType: BlockType.COMMAND,
                    text: 'exportar imagen procesada',
                    color1: '#2DD4BF'
                },
                {
                    opcode: 'show',
                    blockType: BlockType.COMMAND,
                    text: 'mostrar resultado',
                    color1: '#2DD4BF'
                },

                // ======== 💡 NIVEL BÁSICO ========
                {
                    opcode: 'brightness',
                    blockType: BlockType.COMMAND,
                    text: 'brillo [BETA]',
                    arguments: {BETA: {type: ArgumentType.NUMBER, defaultValue: 30}},
                    color1: '#34D399'
                },
                {
                    opcode: 'contrast',
                    blockType: BlockType.COMMAND,
                    text: 'contraste [ALPHA]',
                    arguments: {ALPHA: {type: ArgumentType.NUMBER, defaultValue: 1.2}},
                    color1: '#34D399'
                },
                {
                    opcode: 'saturation',
                    blockType: BlockType.COMMAND,
                    text: 'saturación [S]',
                    arguments: {S: {type: ArgumentType.NUMBER, defaultValue: 1.3}},
                    color1: '#34D399'
                },
                {
                    opcode: 'invert',
                    blockType: BlockType.COMMAND,
                    text: 'invertir colores',
                    color1: '#34D399'
                },
                {
                    opcode: 'pixelate',
                    blockType: BlockType.COMMAND,
                    text: 'pixelar factor [F]',
                    arguments: {F: {type: ArgumentType.NUMBER, defaultValue: 8}},
                    color1: '#34D399'
                },

                // ======== ⚙️ NIVEL INTERMEDIO ========
                {
                    opcode: 'canny',
                    blockType: BlockType.COMMAND,
                    text: 'bordes Canny [T1] [T2]',
                    arguments: {
                        T1: {type: ArgumentType.NUMBER, defaultValue: 100},
                        T2: {type: ArgumentType.NUMBER, defaultValue: 200}
                    },
                    color1: '#FACC15'
                },
                {
                    opcode: 'sobel',
                    blockType: BlockType.COMMAND,
                    text: 'bordes Sobel',
                    color1: '#FACC15'
                },
                {
                    opcode: 'gaussian',
                    blockType: BlockType.COMMAND,
                    text: 'gaussian blur [K]',
                    arguments: {K: {type: ArgumentType.NUMBER, defaultValue: 5}},
                    color1: '#FACC15'
                },
                {
                    opcode: 'rotate',
                    blockType: BlockType.COMMAND,
                    text: 'rotar [DEG]',
                    arguments: {DEG: {type: ArgumentType.NUMBER, defaultValue: 15}},
                    color1: '#FACC15'
                },
                {
                    opcode: 'scale',
                    blockType: BlockType.COMMAND,
                    text: 'escalar [S]',
                    arguments: {S: {type: ArgumentType.NUMBER, defaultValue: 1.2}},
                    color1: '#FACC15'
                },

                // ======== 🚀 NIVEL AVANZADO ========
                {
                    opcode: 'orb',
                    blockType: BlockType.COMMAND,
                    text: 'características ORB',
                    color1: '#A78BFA'
                },
                {
                    opcode: 'watershed',
                    blockType: BlockType.COMMAND,
                    text: 'segmentación Watershed',
                    color1: '#A78BFA'
                },
                {
                    opcode: 'kmeans',
                    blockType: BlockType.COMMAND,
                    text: 'segmentación K-means [K]',
                    arguments: {K: {type: ArgumentType.NUMBER, defaultValue: 3}},
                    color1: '#A78BFA'
                }
            ]
        };
    }

    setServer (args) {
        this.baseURL = args.URL;
    }

    async setImageURL (args) {
        this.runtime._visionOps = [];
        const res = await fetch(args.URL);
        const blob = await res.blob();
        this.lastDataURL = await new Promise(r => {
            const fr = new FileReader();
            fr.onload = () => r(fr.result);
            fr.readAsDataURL(blob);
        });
        this.runtime.emit('VISION_IMAGE', this.lastDataURL);
    }
    setImageFile () {
        return new Promise(resolve => {
            this.runtime._visionOps = [];
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';

            input.onchange = e => {
                const file = e.target.files[0];
                if (!file) return;
                this.lastFileName = file.name || 'imagen.jpg';

                const reader = new FileReader();

                reader.onload = () => {
                    this.lastDataURL = reader.result;

                    // 🔹 Mostrar la imagen cargada localmente de inmediato
                    this.runtime.emit('VISION_IMAGE', this.lastDataURL);

                    // 🔹 Luego intentar enviar al servidor si está activo
                    (async () => {
                        try {
                            const resp = await fetch(`${this.baseURL}/process`, {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({
                                    image_b64: this.lastDataURL,
                                    op: 'none', // operación vacía
                                    params: {}
                                })
                            });

                            const data = await resp.json();

                            // Si el servidor devuelve una imagen procesada
                            if (data && data.image_b64) {
                                this.lastDataURL = data.image_b64;
                                this.runtime.emit('VISION_IMAGE', this.lastDataURL);
                            }
                        } catch (err) {
                            console.warn('⚠️ No se pudo conectar al servidor, mostrando imagen local.');
                        }

                        resolve();
                    })();
                };

                reader.readAsDataURL(file);
            };

            input.click();
        });
    }
    async _call (op, params = {}) {
        if (!this.lastDataURL) throw new Error('Primero usa "cargar imagen desde URL" o "desde archivo local".');

        // 🧩 Registrar cada operación realizada
        if (!this.runtime._visionOps) this.runtime._visionOps = [];
        this.runtime._visionOps.push({name: op, params});

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
        const k = Number(args.K);
        if (k < 1 || k > 99 || k % 2 === 0) {
            this._showAlert(`⚠️ Tamaño de kernel inválido (${k}). Usa un número impar entre 1 y 99.`);
            return;
        }
        return this._call('gaussian', {k});
    }
    sharpen () {
        return this._call('sharpen');
    }
    contours () {
        return this._call('contours');
    }
    rotate (args) {
        const deg = Number(args.DEG);
        if (deg < -360 || deg > 360) {
            this._showAlert(`⚠️ Ángulo inválido (${deg}). Usa valores entre -360° y 360°.`);
            return;
        }
        return this._call('rotate', {deg});
    }
    scale (args) {
        const s = Number(args.S);
        if (s < 0.1 || s > 5) {
            this._showAlert(`⚠️ Valor de escala fuera de rango (${s}). Usa valores entre 0.1 y 5.`);
            return;
        }
        return this._call('scale', {s});
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

    /**
     * Descarga la última imagen procesada como archivo local.
     */
    exportProcessedImage () {
        if (!this.lastDataURL) {
            this._showAlert('⚠️ No hay imagen procesada para exportar.');
            return;
        }

        const link = document.createElement('a');
        link.href = this.lastDataURL;
        link.download = this.lastFileName ? `procesada_${this.lastFileName.replace(/\.[^/.]+$/, '.png')}` :
            'imagen_procesada.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this._showConfirm(' Imagen procesada exportada correctamente.', '#22c55e');
    }

    exportPythonCode () {
    // 🔹 Traducción de operaciones a código Python
        const opToPython = {
            brightness: 'img = cv2.convertScaleAbs(img, alpha=1, beta={beta})',
            contrast: 'img = cv2.convertScaleAbs(img, alpha={alpha}, beta=0)',
            saturation: `
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype('float32')
    hsv[..., 1] *= {s}
    hsv[..., 1] = np.clip(hsv[..., 1], 0, 255)
    img = cv2.cvtColor(hsv.astype('uint8'), cv2.COLOR_HSV2BGR)
            `.trim(),
            invert: 'img = cv2.bitwise_not(img)',
            pixelate: `
    h, w = img.shape[:2]
    temp = cv2.resize(img, (w // {factor}, h // {factor}), interpolation=cv2.INTER_LINEAR)
    img = cv2.resize(temp, (w, h), interpolation=cv2.INTER_NEAREST)
            `.trim(),
            canny: 'img = cv2.Canny(img, {t1}, {t2})',
            sobel: `
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    img = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=5)
            `.trim(),
            gaussian: 'img = cv2.GaussianBlur(img, ({k}, {k}), 0)',
            sharpen: `
    kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
    img = cv2.filter2D(img, -1, kernel)
            `.trim()
        };

        // 🔹 Obtener el nombre real del archivo o usar uno por defecto
        const fileName = this.lastFileName || 'imagen.jpg';

        // 🔹 Inicio del script Python
        let pythonCode = `import cv2
    import numpy as np

    img = cv2.imread('${fileName}')
    `;

        // 🔹 Lista de operaciones realizadas
        const ops = this.runtime._visionOps || [];

        if (ops.length === 0) {
            console.warn('⚠️ No hay operaciones para exportar.');
            return;
        }

        // 🔹 Agrupar operaciones por nivel (básico / intermedio / avanzado)
        const levels = {
            Básico: ['brightness', 'contrast', 'saturation', 'invert', 'pixelate', 'circles', 'rectangles'],
            Intermedio: ['canny', 'sobel', 'gaussian', 'sharpen', 'contours', 'rotate', 'scale', 'translate'],
            Avanzado: ['orb', 'watershed', 'kmeans']
        };

        for (const [nivel, lista] of Object.entries(levels)) {
            const usadas = ops.filter(op => lista.includes(op.name));
            if (usadas.length > 0) {
                pythonCode += `\n# ==== Nivel ${nivel} ====\n`;
                for (const op of usadas) {
                    if (opToPython[op.name]) {
                        pythonCode += `
    ${opToPython[op.name]
        .replace('{alpha}', op.params?.ALPHA || 1.2)
        .replace('{beta}', op.params?.BETA || 30)
        .replace('{s}', op.params?.S || 1.3)
        .replace('{factor}', op.params?.F || 8)
        .replace('{t1}', op.params?.T1 || 100)
        .replace('{t2}', op.params?.T2 || 200)
        .replace('{k}', op.params?.K || 5)
}`;

                    }
                }
            }
        }

        pythonCode += `

    cv2.imshow('Resultado', img)
    cv2.waitKey(0)
    cv2.destroyAllWindows()
    `;

        // 🔹 Crear archivo descargable .py
        const blob = new Blob([pythonCode], {type: 'text/plain'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'vision_script.py';
        a.click();

        console.log(`✅ Código Python exportado correctamente usando '${fileName}'.`);
    }


}


module.exports = Vision;
