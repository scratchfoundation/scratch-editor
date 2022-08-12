const DOMPurify = require('dompurify');

const sanitizeSvg = {};

DOMPurify.addHook(
    'beforeSanitizeAttributes',
    currentNode => {

        if (currentNode && currentNode.href && currentNode.href.baseVal &&
            currentNode.href.baseVal.replace(/\s/g, '').slice(0, 5) !== 'data:'){

            if (currentNode.attributes.getNamedItem('xlink:href')){
                currentNode.attributes.removeNamedItem('xlink:href');
                delete currentNode['xlink:href'];
            }
            if (currentNode.attributes.getNamedItem('href')){
                currentNode.attributes.removeNamedItem('href');
                delete currentNode.href;
            }
        }
        return currentNode;
    }
);

let _TextDecoder;
let _TextEncoder;
if (typeof TextDecoder === 'undefined' || typeof TextEncoder === 'undefined') {
    // Wait to require the text encoding polyfill until we know it's needed.
    // eslint-disable-next-line global-require
    const encoding = require('fastestsmallesttextencoderdecoder');
    _TextDecoder = encoding.TextDecoder;
    _TextEncoder = encoding.TextEncoder;
} else {
    _TextDecoder = TextDecoder;
    _TextEncoder = TextEncoder;
}

sanitizeSvg.sanitizeByteStream = function (data){
    const decoder = new _TextDecoder();
    const encoder = new _TextEncoder();

    const sanitizedValue = DOMPurify.sanitize(decoder.decode(data), {
        USE_PROFILES: {svg: true}
    });

    return encoder.encode(sanitizedValue);
};

module.exports = sanitizeSvg;
