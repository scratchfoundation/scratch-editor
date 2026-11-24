/**
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
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
