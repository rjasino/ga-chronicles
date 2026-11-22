import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}{ext}",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : [
        {
          command: "node --experimental-strip-types tests/e2e/support/wheel-of-names-mock-server.ts",
          url: "http://127.0.0.1:3201/health",
          reuseExistingServer: false,
        },
        {
          command: "npm run dev",
          url: "http://127.0.0.1:3000",
          reuseExistingServer: false,
          env: {
            ...process.env,
            WHEEL_OF_NAMES_API_KEY: "playwright-mock-key",
            WHEEL_OF_NAMES_API_URL: "http://127.0.0.1:3201/api/v3/wheels/animate",
          },
        },
      ],
});
