import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  // E2E tests directory
  testDir: './tests/e2e',

  // Global test timeout
  timeout: 60000,

  // Expect timeout for assertions
  expect: {
    timeout: 10000,
  },

  // Run tests in files in parallel
  fullyParallel: false,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI (extension testing requires serialization)
  workers: 1,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  // Shared settings for all the projects below
  use: {
    // Base URL for web pages
    baseURL: 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Record video on failure
    video: 'retain-on-failure',

    // Take screenshot on failure
    screenshot: 'only-on-failure',

    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'chrome-extension',
      use: {
        ...devices['Desktop Chrome'],
        // Chrome extension specific args
        launchOptions: {
          headless: false,
          args: [
            `--disable-extensions-except=${path.resolve('./dist')}`,
            `--load-extension=${path.resolve('./dist')}`,
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--start-maximized',
          ],
          slowMo: 100, // Slow down actions for extension testing
        },
      },
    },

    {
      name: 'chrome-extension-headless',
      use: {
        ...devices['Desktop Chrome'],
        // Headless mode for CI
        launchOptions: {
          headless: true,
          args: [
            `--disable-extensions-except=${path.resolve('./dist')}`,
            `--load-extension=${path.resolve('./dist')}`,
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-web-security',
            '--headless=new',
          ],
        },
      },
    },
  ],

  // Global setup
  globalSetup: path.resolve('./tests/e2e/helpers/global-setup.ts'),

  // Global teardown
  globalTeardown: path.resolve('./tests/e2e/helpers/global-teardown.ts'),

  // Output directory for test artifacts
  outputDir: 'test-results',

  // Global setup will handle building the extension
  // webServer: {
  //   command: 'npm run build', // Build extension before running tests
  //   port: 3000,
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  // },
});
