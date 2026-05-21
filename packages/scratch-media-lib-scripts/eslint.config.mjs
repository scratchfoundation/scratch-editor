import { eslintConfigScratch } from 'eslint-config-scratch'
import { globalIgnores } from 'eslint/config'
import globals from 'globals'

export default eslintConfigScratch.defineConfig(
  eslintConfigScratch.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      }
    },
  },
  {
    files: ['scripts/tests/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node
      },
    },
  },
  globalIgnores(['node_modules/**', 'output/**']),
)
