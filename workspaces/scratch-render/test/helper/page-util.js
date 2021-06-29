/* global VirtualMachine, ScratchStorage, ScratchSVGRenderer */
/* eslint-env browser */

// Wait for all SVG skins to be loaded.
// TODO: this is extremely janky and should be removed once vm.loadProject waits for SVG skins to load
// https://github.com/LLK/scratch-render/issues/563
window.waitForSVGSkinLoad = renderer => new Promise(resolve => {
    // eslint-disable-next-line prefer-const
    let interval;

    const waitInner = () => {
        let numSVGSkins = 0;
        let numLoadedSVGSkins = 0;
        for (const skin of renderer._allSkins) {
            if (skin.constructor.name !== 'SVGSkin') continue;
            numSVGSkins++;
            if (skin._svgImage.complete) numLoadedSVGSkins++;
        }

        if (numSVGSkins === numLoadedSVGSkins) {
            clearInterval(interval);
            resolve();
        }
    };

    interval = setInterval(waitInner, 1);
});

window.loadFileInputIntoVM = (fileInput, vm, render) => {
    const reader = new FileReader();
    return new Promise(resolve => {
        reader.onload = () => {
            vm.start();
            vm.loadProject(reader.result)
                .then(() => window.waitForSVGSkinLoad(render))
                .then(() => {
                    resolve();
                });
        };
        reader.readAsArrayBuffer(fileInput.files[0]);
    });
};

window.initVM = render => {
    const vm = new VirtualMachine();
    const storage = new ScratchStorage();

    vm.attachStorage(storage);
    vm.attachRenderer(render);
    vm.attachV2SVGAdapter(ScratchSVGRenderer.V2SVGAdapter);
    vm.attachV2BitmapAdapter(new ScratchSVGRenderer.BitmapAdapter());

    return vm;
};
