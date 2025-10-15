const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');

class VisionActions {
    constructor (runtime) {
        this.runtime = runtime;
        this.baseURL = 'http://127.0.0.1:8001';
        this.lastDataURL = null;
    }

    _showAlert (message) {
        const existing = document.getElementById('vision-alert');
        if (existing) existing.remove();

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

    // =========================================================
    // ✅ INFORMACIÓN DE LA EXTENSIÓN (formato Scratch 3 oficial)
    // =========================================================
    getInfo () {
        return {
            id: 'visionactions',
            name: 'Vision Acciones',
            color1: '#2DD4BF',
            color2: '#0E7490',
            color3: '#134E4A',
            blocks: [
                {
                    opcode: 'visionactions_setImageURL',
                    blockType: BlockType.COMMAND,
                    text: 'cargar imagen desde URL [URL]',
                    arguments: {
                        URL: {
                            type: ArgumentType.STRING,
                            defaultValue: 'https://picsum.photos/480/360'
                        }
                    }
                },
                {
                    opcode: 'visionactions_setImageFile',
                    blockType: BlockType.COMMAND,
                    text: 'cargar imagen desde archivo local'
                },
                {
                    opcode: 'visionactions_show',
                    blockType: BlockType.COMMAND,
                    text: 'mostrar resultado'
                },
                {
                    opcode: 'visionactions_exportProcessedImage',
                    blockType: BlockType.COMMAND,
                    text: 'exportar imagen procesada'
                },
                {
                    opcode: 'visionactions_exportPythonCode',
                    blockType: BlockType.COMMAND,
                    text: 'exportar código Python'
                }
            ],
            menus: {} // requerido aunque esté vacío
        };
    }

    // =========================================================
    // ✅ REGISTRO DE PRIMITIVAS (VM las usa con el prefijo exacto)
    // =========================================================
    getPrimitives () {
        return {
            visionactions_setImageURL: this.setImageURL.bind(this),
            visionactions_setImageFile: this.setImageFile.bind(this),
            visionactions_show: this.show.bind(this),
            visionactions_exportProcessedImage: this.exportProcessedImage.bind(this),
            visionactions_exportPythonCode: this.exportPythonCode.bind(this)
        };
    }

    // =========================================================
    // 🧩 IMPLEMENTACIONES DE BLOQUES
    // =========================================================
    async setImageURL (args) {
        try {
            const res = await fetch(args.URL);
            const blob = await res.blob();
            const reader = new FileReader();
            reader.onload = () => {
                this.lastDataURL = reader.result;
                this.runtime.emit('VISION_IMAGE', this.lastDataURL);
            };
            reader.readAsDataURL(blob);
        } catch (e) {
            this._showAlert('❌ Error cargando imagen desde URL.');
        }
    }

    setImageFile () {
        return new Promise(resolve => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = e => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                    this.lastDataURL = reader.result;
                    this.runtime.emit('VISION_IMAGE', this.lastDataURL);
                    resolve();
                };
                reader.readAsDataURL(file);
            };
            input.click();
        });
    }

    show () {
        if (this.lastDataURL) {
            this.runtime.emit('VISION_IMAGE', this.lastDataURL);
        } else {
            this._showAlert('⚠️ No hay imagen cargada.');
        }
    }

    exportProcessedImage () {
        if (!this.lastDataURL) {
            return this._showAlert('⚠️ No hay imagen procesada.');
        }
        const link = document.createElement('a');
        link.href = this.lastDataURL;
        link.download = 'imagen_procesada.png';
        link.click();
    }

    exportPythonCode () {
        this._showAlert('El código Python se exportará desde Vision Básico / Intermedio / Avanzado.');
    }
}

// =========================================================
// ✅ EXPORTACIÓN FORMAL USADA POR SCRATCH VM
// =========================================================
module.exports = function (runtime) {
    return new VisionActions(runtime);
};
