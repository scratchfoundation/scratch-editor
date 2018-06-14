import keyMirror from 'keymirror';

const Modes = keyMirror({
    BIT_BRUSH: null,
    BIT_LINE: null,
    BIT_RECT: null,
    BIT_ERASER: null,
    BRUSH: null,
    ERASER: null,
    LINE: null,
    FILL: null,
    SELECT: null,
    RESHAPE: null,
    OVAL: null,
    RECT: null,
    ROUNDED_RECT: null,
    TEXT: null
});

const BitmapModes = keyMirror({
    BIT_BRUSH: null,
    BIT_LINE: null,
    BIT_RECT: null,
    BIT_ERASER: null
});

export {
    Modes as default,
    BitmapModes
};
