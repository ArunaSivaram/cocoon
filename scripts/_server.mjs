import { spawn } from 'node:child_process';

const DEV_URL = 'http://localhost:5173';

export async function startDevServer({ silent = true } = {}) {
  const child = spawn('npm', ['run', 'dev'], {
    stdio: silent ? 'ignore' : 'inherit',
    env: { ...process.env, BROWSER: 'none' },
  });

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(DEV_URL, { signal: AbortSignal.timeout(500) });
      if (res.ok) return { child, url: DEV_URL };
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  child.kill('SIGTERM');
  throw new Error(`Vite dev server did not come up within 30 s at ${DEV_URL}`);
}

export async function stopDevServer(child) {
  if (!child || child.killed) return;
  child.kill('SIGTERM');
  await new Promise((resolve) => child.once('exit', resolve));
}

export const VIEWPORTS = {
  phone: { width: 390, height: 844, deviceScaleFactor: 2 },
  laptop: { width: 1280, height: 800, deviceScaleFactor: 2 },
};

export async function waitForFontsAndPaint(page) {
  await page.evaluate(() => document.fonts.ready);
  // Give MSW + React a moment to resolve queries and swap out skeletons
  // before we snapshot. 150 ms wasn't enough for the step-10 locked screen.
  await page.waitForTimeout(400);
}

/**
 * Keep this in sync with src/lib/auth.ts — same storage key, same session
 * shape. Playwright injects it via addInitScript before any page JS runs,
 * so the route guard sees "signed in" on the very first render.
 *
 * `signed_in_at` is set to "now" so step-10 flows that gate on recent
 * sign-in (forgot-passcode delete) don't force a re-sign-in during tests.
 */
export const SIGNED_IN_INIT_SCRIPT = `
  try {
    localStorage.setItem(
      'cocoon.session.v1',
      JSON.stringify({
        accessToken: 'mock-dev-token',
        user: {
          id: '00000000-0000-4000-8000-000000000001',
          name: 'Test User',
          email: 'test@cocoon.local',
          avatarUrl: null,
        },
        signed_in_at: new Date().toISOString(),
      }),
    );
  } catch {}
`;
