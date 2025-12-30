import {eslintConfigScratch} from 'eslint-config-scratch';
import {globalIgnores} from 'eslint/config';
import globals from 'globals';
import importPlugin from 'eslint-plugin-import';
import path from 'path';

export default eslintConfigScratch.defineConfig(
    eslintConfigScratch.legacy.base,
    importPlugin.flatConfigs.errors,
    {
        files: ['*.{js,cjs,mjs,ts}', 'scripts/**/*.{js,cjs,mjs,ts}'],
        extends: [eslintConfigScratch.legacy.node],
        languageOptions: {
            globals: globals.node
        },
        rules: {
            'no-console': 'off'
        },
        settings: {
            // TODO: figure out why this is needed...
            // probably something with eslint-plugin-import's parser or resolver
            'import/core-modules': [
                'eslint/config'
            ]
        }
    },
    {
        files: ['{src,test}/**/*.{js,cjs,mjs,jsx,ts,tsx}'],
        extends: [
            eslintConfigScratch.legacy.es6,
            eslintConfigScratch.legacy.react,
            eslintConfigScratch.legacy.typescript
        ],
        languageOptions: {
            globals: {
                ...globals.browser,
                process: 'readonly'
            },
            parserOptions: {
                projectService: false,
                tsconfigRootDir: import.meta.dirname,
                project: [
                    'tsconfig.eslint.json',
                    'tsconfig.test.json'
                ]
            }
        },
        settings: {
            'react': {
                version: 'detect'
            },
            'import/resolver': {
                webpack: {
                    config: path.resolve(import.meta.dirname, 'webpack.config.js')
                }
            }
        },
        rules: {
            // BEGIN: these caused trouble after upgrading eslint-plugin-react from 7.24.0 to 7.33.2
            'react/forbid-prop-types': 'warn',
            'react/no-unknown-property': 'warn',
            // END: these caused trouble after upgrading eslint-plugin-react from 7.24.0 to 7.33.2

            // we should probably just fix these...
            'arrow-parens': 'warn',
            'react/no-deprecated': 'warn',
            'require-atomic-updates': 'warn',
            '@typescript-eslint/no-unused-vars': ['warn', {
                args: 'after-used',
                caughtErrors: 'none', // TODO: use caughtErrorsPattern instead
                varsIgnorePattern: '^_'
            }],
            '@typescript-eslint/no-use-before-define': 'warn',
            '@typescript-eslint/prefer-promise-reject-errors': 'warn'
        }
    },
    {
        files: ['test/**/*.{js,cjs,mjs,jsx,ts,tsx}'],
        languageOptions: {
            globals: {
                ...globals.jest,
                ...globals.node
            }
        },
        rules: {
            'max-len': [
                'warn',
                // settings copied from eslint-config-scratch.legacy.base
                {
                    code: 120,
                    tabWidth: 4,
                    ignoreUrls: true
                }
            ],
            'react/prop-types': 'off' // don't worry about prop types in tests
        }
    },
    {
        files: ['{src,test}/**/*.{ts,tsx}'],
        rules: {
            // TODO: get TS parsing to work with eslint-plugin-import
            'import/named': 'off'
        }
    },
    {
        // disable some checks for these generated files
        files: ['{src,test}/**/types.d.ts'],
        rules: {
            '@stylistic/indent': 'off'
        }
    },
    {
        files: [
            'src/lib/libraries/extensions/index.jsx',
            'src/lib/libraries/decks/*.js'
        ],
        rules: {
            // the way these files are built makes duplicate imports the natural way to do things
            'no-duplicate-imports': 'off'
        }
    },
    {
        files: ['test/unit/util/define-dynamic-block.test.js'],
        settings: {
            // TODO: figure out why this is needed...
            // probably something with eslint-plugin-import's parser or resolver
            'import/core-modules': [
                '@scratch/scratch-vm/src/extension-support/block-type'
            ]
        }
    },
    globalIgnores([
        'build/**/*',
        'dist/**/*',
        'node_modules/**/*'
    ])
);
