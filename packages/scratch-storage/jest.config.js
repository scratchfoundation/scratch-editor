const {createDefaultEsmPreset} = require('ts-jest');

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    moduleNameMapper: {
        // Allows jest to find the asset files, otherwise it looks for them with the
        // `?arrayBuffer` as part of the name and doesn't end up transforming them.
        '^(.+)\\?arrayBuffer$': '$1'
    },
    moduleFileExtensions: ['ts', 'js'],
    transform: {
        ...createDefaultEsmPreset({
            tsconfig: 'tsconfig.test.json',

            // The webpack 5 way to include web workers is to use
            // `new Worker(new URL('./worker.js', import.meta.url));`.
            // See https://webpack.js.org/guides/web-workers/
            // However, the `import.meta.url` is ESM-only and Jest's support for ESM is
            // still experimental. So, we need to mock it instead (or use experimental
            // jest & node features).
            //
            // Also see https://www.npmjs.com/package/ts-jest-mock-import-meta
            diagnostics: {
                ignoreCodes: [1343]
            },
            astTransformers: {
                before: [
                    {
                        path: 'ts-jest-mock-import-meta',
                        options: {metaObjectReplacement: {url: 'https://example.com'}}
                    }
                ]
            }
        }).transform,
        '\\.(png|svg|wav)$': '<rootDir>/test/transformers/arraybuffer-loader.js'
    }
};
