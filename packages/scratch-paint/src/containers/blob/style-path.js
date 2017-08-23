const stylePath = function (path, isEraser) {
    if (isEraser) {
        path.fillColor = 'white';
    } else {
        // TODO: Add back brush styling. Keep a separate active toolbar style for brush vs pen.
        // path = pg.stylebar.applyActiveToolbarStyle(path);
        path.fillColor = 'black';
    }
};

const styleCursorPreview = function (path, isEraser) {
    if (isEraser) {
        path.fillColor = 'white';
        path.strokeColor = 'cornflowerblue';
        path.strokeWidth = 1;
    } else {
        // TODO: Add back brush styling. Keep a separate active toolbar style for brush vs pen.
        // path = pg.stylebar.applyActiveToolbarStyle(path);
        path.fillColor = 'black';
        path.strokeColor = 'cornflowerblue';
        path.strokeWidth = 1;
    }
};

export {
    stylePath,
    styleCursorPreview
};
