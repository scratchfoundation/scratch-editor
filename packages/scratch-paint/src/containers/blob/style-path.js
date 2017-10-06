const stylePath = function (path, options) {
    if (options.isEraser) {
        path.fillColor = 'white';
    } else {
        path.fillColor = options.fillColor;
    }
};

const styleCursorPreview = function (path, options) {
    if (options.isEraser) {
        path.fillColor = 'white';
        path.strokeColor = 'cornflowerblue';
        path.strokeWidth = 1;
    } else {
        path.fillColor = options.fillColor;
    }
};

export {
    stylePath,
    styleCursorPreview
};
