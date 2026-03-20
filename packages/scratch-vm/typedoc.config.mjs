/** @type {Partial<import('typedoc').TypeDocOptions>} */
const config = {
    entryPoints: ['src/index.js'],
    out: 'playground/docs',
    excludePrivate: false,
    readme: 'README.md',
    validation: {
        invalidLink: true
    }
};

export default config;
