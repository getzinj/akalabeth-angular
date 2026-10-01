import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';


// Some sandboxed CI environments pre-install Chromium at this fixed path instead of
// letting Playwright manage its own browser binary. Only pin executablePath when that
// path actually exists, so local dev and other CI runners fall back to Playwright's
// normal managed-browser resolution.
const sandboxChromiumPath: string = '/opt/pw-browsers/chromium';

// CI gives each run its own port. The self-hosted runners are several runner registrations on
// one Windows host, so a hard-coded 4200 belongs to every e2e job on that machine at once, and a
// dev server leaked by an earlier job goes on holding it - which is how runs #520 and #521 both
// died on "http://localhost:4200 is already used" with no other e2e job running at the time.
const port: number = Number(process.env['E2E_PORT'] ?? 4202);
const baseURL: string = `http://localhost:${ port }`;


export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  // 'html' writes a self-contained report to playwright-report/ so CI has something to
  // upload as an artifact when a run fails; 'list' keeps the terminal output contributors see.
  //
  // Both output paths are spelled out because Playwright's defaults are not relative to this
  // config: given no explicit value it resolves them against the nearest package.json above the
  // config directory, which here is the workspace root, three levels up. That is why the e2e
  // job's upload of apps/Akalabeth/e2e/playwright-report/ kept reporting "No files were found".
  reporter: [ [ 'list' ], [ 'html', { outputFolder: 'playwright-report', open: 'never' } ] ],
  outputDir: 'test-results',
  timeout: 30_000,
  use: {
    baseURL: baseURL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `npx nx serve Akalabeth --port=${ port }`,
    cwd: '../../..',
    url: baseURL,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: existsSync(sandboxChromiumPath) ? { executablePath: sandboxChromiumPath } : {},
      },
    },
  ],
});
