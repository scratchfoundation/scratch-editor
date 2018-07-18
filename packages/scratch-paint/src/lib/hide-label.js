const localeTooBig = [
    'ab',
    'ca',
    'cy',
    'de',
    'et',
    'el',
    'ga',
    'gl',
    'mi',
    'nl',
    'ja',
    'ja-Hira',
    'nb',
    'nn',
    'th',
    'sr',
    'sk',
    'sl',
    'fi',
    'sv',
    'vi',
    'tr',
    'uk'
];

const hideLabel = locale => localeTooBig.includes(locale);

export {
    hideLabel
};
