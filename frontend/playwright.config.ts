import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 2,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3171",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 320, height: 740 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: "npm run build && npm run start -- --hostname 127.0.0.1 --port 3171",
    url: "http://127.0.0.1:3171",
    reuseExistingServer: false,
    timeout: 180_000,
    env: { PLAYWRIGHT_TEST: "1", NEXT_PUBLIC_MENU_API_BASE_URL: "", NEXT_TELEMETRY_DISABLED: "1" },
  },
});
