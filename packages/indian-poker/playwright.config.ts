import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
  },
  webServer: [
    {
      command: 'pnpm --filter @indian-poker/server dev',
      url: 'http://localhost:3002/health',
      timeout: 120_000,
      reuseExistingServer: true,
    },
    {
      command: 'VITE_E2E=1 pnpm dev -- --host 127.0.0.1 --port 5173',
      url: 'http://localhost:5173',
      timeout: 120_000,
      reuseExistingServer: true,
    },
  ],
})
