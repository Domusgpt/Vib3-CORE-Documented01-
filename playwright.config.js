import { defineConfig, devices } from '@playwright/test';

/**
 * VIB3+ SDK Playwright Configuration
 * @see https://playwright.dev/docs/test-configuration
 *
 * Environment variables:
 *   VIB3_GPU=1              - Enable GPU-accelerated rendering (requires real GPU)
 *   PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH - Override Chromium path
 */

const GPU_ENABLED = process.env.VIB3_GPU === '1';

// Chrome flags for headless without GPU (SwiftShader software rendering)
const HEADLESS_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--enable-unsafe-swiftshader',
  '--use-gl=swiftshader',
  '--disable-software-rasterizer',
  '--disable-extensions',
  '--disable-background-networking',
  `--crash-dumps-dir=${process.env.TMPDIR || '/home/user/tmp'}`,
];

// Chrome flags for GPU-accelerated rendering (requires NVIDIA GPU + drivers)
const GPU_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--headless=new',
  '--enable-gpu',
  '--ignore-gpu-blocklist',
  '--enable-features=Vulkan',
  '--use-angle=vulkan',
  '--enable-unsafe-webgpu',
  '--disable-extensions',
  '--disable-background-networking',
  `--crash-dumps-dir=${process.env.TMPDIR || '/tmp'}`,
];

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',

  /* Run tests in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Timeout per test */
  timeout: 60000,

  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: 'http://localhost:3457',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Capture screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video recording */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
            '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome',
          env: {
            ...process.env,
            TMPDIR: process.env.TMPDIR || '/home/user/tmp',
          },
          args: GPU_ENABLED ? GPU_ARGS : HEADLESS_ARGS,
        },
      },
    },
  ],

  /* Output folder for test artifacts */
  outputDir: 'test-results',

  /* Web server to start before tests */
  webServer: {
    command: 'node scripts/test-server.js',
    url: 'http://localhost:3457',
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
});
