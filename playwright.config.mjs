import { defineConfig } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
const host = process.env.PLAYWRIGHT_HOST ?? "127.0.0.1";

export default defineConfig({
  testDir: "./Tests",
  testMatch: /ui-acceptance\.spec\.mjs/,
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  // Keep UI acceptance sequential within the spec because concurrent WebGL pages have been flaky in headless Chromium.
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: `http://${host}:${port}`,
    browserName: "chromium",
    headless: true,
    trace: "on-first-retry",
    viewport: {
      width: 1280,
      height: 900
    }
  },
  webServer: {
    command: "node ./Tests/support/static-server.mjs",
    url: `http://${host}:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 15000
  }
});