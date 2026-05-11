import {eslintConfigScratch} from 'eslint-config-scratch';
import {globalIgnores} from 'eslint/config';
import globals from 'globals';

export default eslintConfigScratch.defineConfig(
    eslintConfigScratch.legacy.base,
    {
        files: ['src/**/*.{,c,m}js'],
        extends: [eslintConfigScratch.legacy.es6],
        languageOptions: {
            globals: globals.browser
        }
    },
    {
        files: [
            '*.{,c,m}js', // for example, webpack.config.js
            'test/**/*.{,c,m}js'
        ],
        ignores: ['test/playwright/**/*.{,c,m}js'],
        extends: [eslintConfigScratch.legacy.node],
        languageOptions: {
            globals: globals.node
        }
    },
    {
        // Playwright test files run in Node but contain page.evaluate() callbacks
        // that reference browser globals (window, document) executed in Chromium.
        files: ['test/playwright/**/*.{,c,m}js'],
        extends: [eslintConfigScratch.legacy.node],
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.browser
            }
        }
    },
    globalIgnores([
        'dist/**/*',
        'node_modules/**/*',
        'playground/**/*'
    ])
);
