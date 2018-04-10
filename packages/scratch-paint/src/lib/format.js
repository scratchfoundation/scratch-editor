import keyMirror from 'keymirror';

const Formats = keyMirror({
    BITMAP: null,
    VECTOR: null,
    // Format changes which should not trigger conversions, for instance undo
    BITMAP_SKIP_CONVERT: null,
    VECTOR_SKIP_CONVERT: null
});

const isVector = function (format) {
    return format === Formats.VECTOR || format === Formats.VECTOR_SKIP_CONVERT;
};

const isBitmap = function (format) {
    return format === Formats.BITMAP || format === Formats.BITMAP_SKIP_CONVERT;
};

export {
    Formats as default,
    isVector,
    isBitmap
};
