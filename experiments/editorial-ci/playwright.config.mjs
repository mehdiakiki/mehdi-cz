import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "**/preview.spec.mjs",
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: { browserName: "chromium", trace: "retain-on-failure" },
  reporter: "list",
});
