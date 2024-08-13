module.exports = {
    semi: true,
    arrowParens: 'avoid',
    bracketSameLine: true,
    bracketSpacing: true,
    singleQuote: true,
    trailingComma: 'all',

    plugins: [
        require.resolve('@trivago/prettier-plugin-sort-imports'),
        'prettier-plugin-tailwindcss',
    ],
    importOrder: ['^@', '^[./]'],
    importOrderSeparation: false,
};
