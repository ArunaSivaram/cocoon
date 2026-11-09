import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { startDevServer, stopDevServer, VIEWPORTS, waitForFontsAndPaint } from './_server.mjs';

const ROUTES = [
  { slug: 'signin', path: '/signin' },
  { slug: 'home', path: '/' },
  { slug: 'entry', path: '/entry/example' },
  { slug: 'calendar', path: '/calendar' },
  { slug: 'memories', path: '/memories' },
];

const OUT_DIR = 'shots';

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const { child, url } = await startDevServer();
  const browser = await chromium.launch();
  try {
    for (const [viewportKey, viewport] of Object.entries(VIEWPORTS)) {
      const context = await browser.newContext({
        viewport,
        deviceScaleFactor: viewport.deviceScaleFactor,
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      for (const route of ROUTES) {
        await page.goto(`${url}${route.path}`, { waitUntil: 'networkidle' });
        await waitForFontsAndPaint(page);
        const filename = `${OUT_DIR}/${route.slug}-${viewportKey}.png`;
        await page.screenshot({ path: filename, fullPage: true });
        console.log(`  ✓ ${filename}`);
      }
      await context.close();
    }
  } finally {
    await browser.close();
    await stopDevServer(child);
  }
  console.log(`\nScreenshots written to ./${OUT_DIR}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
