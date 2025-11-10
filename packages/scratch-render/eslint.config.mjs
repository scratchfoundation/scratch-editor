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
        extends: [eslintConfigScratch.legacy.node],
        languageOptions: {
            globals: globals.node
        }
    },
    {
        files: ['test/helper/**/*.{,c,m}js'],
        languageOptions: {
            globals: globals.browser
        }
    },
    {
        files: ['src/playground/**/*.{,c,m}js'],
        rules: {
            'no-console': 'off'
        }
    },
    globalIgnores([
        'dist/**/*',
        'node_modules/**/*',
        'playground/**/*'
    ])
);
