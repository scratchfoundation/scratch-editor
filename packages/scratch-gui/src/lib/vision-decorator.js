/**
 * @function setupVisionKitDecorator
 * @description Espera a que el panel de bloques de Vision Kit se cargue,
 * y añade encabezados coloridos a cada grupo de bloques.
 */
const setupVisionKitDecorator = () => {
    console.log('✅ Vision Kit Decorator activo');

    const style = document.createElement('style');
    style.textContent = `
    .vision-section-title {
        font-weight: bold;
        color: white;
        padding: 6px 10px;
        margin: 10px 8px;
        border-radius: 6px;
        font-family: 'Inter', sans-serif;
        font-size: 13px;
    }
    .vision-act { background: #2DD4BF; }
    .vision-basic { background: #34D399; }
    .vision-inter { background: #FACC15; color: #000; }
    .vision-adv { background: #A78BFA; }
    `;
    document.head.appendChild(style);

    const observer = new MutationObserver(() => {
        const flyout = document.querySelector('.blocklyFlyout');
        if (!flyout) return;

        const texts = Array.from(flyout.querySelectorAll('.blocklyText'));
        if (!texts.some(t => t.textContent.includes('cargar imagen desde URL'))) return;
        if (flyout.querySelector('.vision-section-title')) return;

        const sections = [
            {marker: 'cargar imagen desde URL', label: '🧩 ACCIONES', class: 'vision-act'},
            {marker: 'brillo', label: '💡 NIVEL BÁSICO', class: 'vision-basic'},
            {marker: 'bordes Canny', label: '⚙️ NIVEL INTERMEDIO', class: 'vision-inter'},
            {marker: 'características ORB', label: '🚀 NIVEL AVANZADO', class: 'vision-adv'}
        ];

        for (const sec of sections) {
            const target = texts.find(t => t.textContent.includes(sec.marker));
            if (target) {
                const div = document.createElement('div');
                div.textContent = sec.label;
                div.className = `vision-section-title ${sec.class}`;
                flyout.insertBefore(div, target.closest('g') || target.parentNode);
            }
        }
    });

    observer.observe(document.body, {childList: true, subtree: true});
};

export {setupVisionKitDecorator};
