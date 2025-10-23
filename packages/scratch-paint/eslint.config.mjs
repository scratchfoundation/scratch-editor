import {eslintConfigScratch} from 'eslint-config-scratch';
import {globalIgnores} from 'eslint/config';
import globals from 'globals';

export default eslintConfigScratch.defineConfig(
    eslintConfigScratch.legacy.base,
    {
        files: [
            '*.{js,cjs,mjs,ts}', // for example, webpack.config.js
            'scripts/**/*.{js,cjs,mjs,ts}'
        ],
        extends: [eslintConfigScratch.legacy.node],
        languageOptions: {
            globals: globals.node
        },
        rules: {
            'no-console': 'off'
        }
    },
    {
        files: ['{src,test}/**/*.{js,cjs,mjs,jsx,ts,tsx}'],
        extends: [
            eslintConfigScratch.legacy.es6,
            eslintConfigScratch.legacy.react
        ],
        languageOptions: {
            globals: globals.browser
        },
        rules: {
            // BEGIN: these caused trouble after upgrading eslint-plugin-react from 7.24.0 to 7.33.2
            'react/forbid-prop-types': 'warn',
            'react/no-unknown-property': 'warn',
            // END: these caused trouble after upgrading eslint-plugin-react from 7.24.0 to 7.33.2

            // we should probably just fix these...
            'react/no-deprecated': 'warn'
        },
        settings: {
            react: {
                version: 'detect'
            }
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
        }
    },
    globalIgnores([
        'dist/**',
        'node_modules/**',
        'playground/**'
    ])
);
