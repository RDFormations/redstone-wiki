/** @type {import('@playwright/test').PlaywrightTestConfig} */
const { defineConfig } = require('@playwright/test')

const siteUrl = (process.env.LMS_E2E_SITE_URL || process.env.WIKI_URL || 'http://127.0.0.1:3000').replace(
  /\/$/,
  ''
)

module.exports = defineConfig({
  testDir: 'server/modules/redstone/tests/playwright',
  testMatch: '**/*.spec.js',
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: siteUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  }
})
