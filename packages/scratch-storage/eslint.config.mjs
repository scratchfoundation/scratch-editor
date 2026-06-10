import {eslintConfigScratch} from 'eslint-config-scratch';
import {globalIgnores} from 'eslint/config';
import globals from 'globals';

export default eslintConfigScratch.defineConfig(
    eslintConfigScratch.legacy.base,
    {
        files: [
            '*.{js,cjs,mjs,ts}' // for example, webpack.config.js
        ],
        extends: [eslintConfigScratch.legacy.node]
    },
    {
        files: ['src/**/*.{js,cjs,mjs,jsx,ts,tsx}'],
        extends: [
            eslintConfigScratch.legacy.es6,
            eslintConfigScratch.legacy.typescript
        ],
        languageOptions: {
            globals: globals.node
        },
        rules: {
            // TODO: Enable these rules after fixing existing violations. This will change the API!
            '@typescript-eslint/no-redeclare': 'off', // allow types and values with the same name
            '@typescript-eslint/prefer-promise-reject-errors': 'off' // allow rejecting with non-Error values
        }
    },
    {
        files: ['test/**/*.{js,cjs,mjs,jsx,ts,tsx}'],
        extends: [
            eslintConfigScratch.legacy.es6
        ],
        languageOptions: {
            globals: {
                ...globals.jest,
                ...globals.node
            }
        },
        rules: {
            'no-console': 'off'
        }
    },
    globalIgnores([
        'dist/**',
        'node_modules/**'
    ])
);
