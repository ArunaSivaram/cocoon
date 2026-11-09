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
  // Small settle for any transition the OS-reduced-motion rule hasn't zeroed.
  await page.waitForTimeout(150);
}
