const localeTooBig = [
    'ab',
    'ca',
    'cy',
    'de',
    'et',
    'el',
    'ga',
    'gd',
    'gl',
    'mi',
    'nl',
    'ja',
    'ja-Hira',
    'nb',
    'nn',
    'rap',
    'th',
    'sr',
    'sk',
    'sl',
    'fi',
    'sv',
    'sw',
    'vi',
    'tr',
    'uk'
];

const hideLabel = locale => localeTooBig.includes(locale);

export {
    hideLabel
};
