// Marexsoft Corporation
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:4600',
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node server.js',
    port: 4600,
    reuseExistingServer: true,
    timeout: 10000,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
// Marexsoft Corporation
