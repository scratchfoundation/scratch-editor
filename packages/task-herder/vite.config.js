/// <reference types="vitest/config" />
import dts from 'unplugin-dts/vite'
import { defineConfig } from 'vite'
import packageJson from './package.json'

// Externalize all dependencies, peerDependencies, and optionalDependencies, but not devDependencies.
// Inspired in part by `davidmyersdev/vite-plugin-externalize-deps`.
// Note that recent versions of Vite automatically externalize Node built-in modules.
// Adding Node built-ins here suppresses warnings, but I say we want those warnings...
const externalDeps = [
  ...Object.keys(packageJson.dependencies || {}),
  ...Object.keys(packageJson.peerDependencies || {}),
  ...Object.keys(packageJson.optionalDependencies || {}),
].map((name) => new RegExp(`^${name}(?:/.*)?$`))

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'TaskHerder',
      fileName: 'task-herder',
    },
    rolldownOptions: {
      external: externalDeps,
      output: {
        /**
         * Customize the global variable names for externalized dependencies in UMD builds.
         * @param {string} depName - The name of a dependency
         * @returns {string} - The global variable name to use for the dependency
         */
        globals: (depName) => {
          switch (depName) {
            case 'p-limit':
              return 'pLimit'
            default:
              return depName
          }
        },
      },
    },
  },
  plugins: [
    // Generate TypeScript declaration files
    dts({
      insertTypesEntry: true,
      tsconfigPath: 'tsconfig.build.json',
    }),
  ],
  test: {
    coverage: {
      exclude: ['dist/**', 'node_modules/**', 'test/**', 'vite.config.js'],
    },
    reporters: [
      'default',

      // This is mainly interesting for reporting GHA test results on PRs through `publish-unit-test-result-action`,
      // but including it even outside of CI isn't expensive and might help catch configuration issues that would
      // otherwise lead to "CI only" problems.
      'junit',

      // The `github-actions` reporter is added by default if running in GHA, but not if reporters are customized.
      // For our purposes, it's somewhat redundant with `junit`, but it's kinda nice when looking at GHA output.
      ...(process.env.GITHUB_ACTIONS === 'true' ? ['github-actions'] : []),
    ],
    outputFile: {
      junit: 'test-results/junit.xml',
    },
  },
})
