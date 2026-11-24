/**
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    reporters: [
      'default',
      // Read by the monorepo's CI test-results summary (publish-unit-test-result-action).
      'junit',
      // GitHub Actions annotations are only added by default when reporters aren't customized.
      ...(process.env.GITHUB_ACTIONS === 'true' ? ['github-actions'] : []),
    ],
    outputFile: {
      junit: 'test-results/junit.xml',
    },
    projects: [
      {
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
          environment: 'jsdom',
        },
      },
      {
        test: {
          name: 'browser',
          include: ['tests/browser/**/*.test.ts'],
          browser: {
            provider: playwright(),
            enabled: true,
            // to see the browser, run something like one of these:
            // `npm run test:browser -- --browser.headless=false`
            // `PWDEBUG=1 npm run test:browser` (also pauses on startup and opens devtools)
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
})
