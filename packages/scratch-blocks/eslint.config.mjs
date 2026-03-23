import { eslintConfigScratch } from 'eslint-config-scratch'
import { globalIgnores } from 'eslint/config'
import tseslint from 'typescript-eslint'

export default eslintConfigScratch.defineConfig(
  eslintConfigScratch.recommended,
  {
    languageOptions: {
      globals: {
        Blockly: 'readonly',
        goog: 'readonly',
      },
    },
  },
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    plugins: { '@typescript-eslint': tseslint.plugin },
  },
  {
    // TODO: upstream to eslint-config-scratch
    files: ['**/*.{ts,tsx,mts,cts}'],
    rules: {
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    // Tests frequently introspect internals and invoke prototype methods directly.
    files: ['tests/**/*.{ts,tsx,mts,cts}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },
  globalIgnores([
    '*_compressed*.js',
    '*_uncompressed*.js',
    'msg/**',
    'core/css.js',
    'i18n/**',
    'tests/jsunit/**',
    'tests/workspace_svg/**',
    'tests/blocks/**',
    'demos/**',
    'accessible/**',
    'appengine/**',
    'shim/**',
    'dist/**',
    'gh-pages/**',
    'commitlint.config.js',
    'release.config.js',
    'webpack.config.js',
    'build/**',
    'github-pages/**',
    'node_modules/**',
  ]),
)
