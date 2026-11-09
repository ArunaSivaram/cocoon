import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import {
  SIGNED_IN_INIT_SCRIPT,
  startDevServer,
  stopDevServer,
  VIEWPORTS,
  waitForFontsAndPaint,
} from './_server.mjs';

const ROUTES = [
  { slug: 'signin', path: '/signin', requireAuth: false },
  { slug: 'home', path: '/', requireAuth: true },
  { slug: 'entry', path: '/entry/example', requireAuth: true },
  { slug: 'calendar', path: '/calendar', requireAuth: true },
  { slug: 'memories', path: '/memories', requireAuth: true },
];

const OUT_DIR = 'shots';

async function screenshotRoute({ browser, viewport, seedSession, route, url, outDir }) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: viewport.deviceScaleFactor,
    reducedMotion: 'reduce',
  });
  if (seedSession) await context.addInitScript(SIGNED_IN_INIT_SCRIPT);
  const page = await context.newPage();
  await page.goto(`${url}${route.path}`, { waitUntil: 'networkidle' });
  await waitForFontsAndPaint(page);
  const [viewportKey] = Object.entries(VIEWPORTS).find(([, v]) => v === viewport) ?? [];
  const filename = `${outDir}/${route.slug}-${viewportKey}.png`;
  await page.screenshot({ path: filename, fullPage: true });
  console.log(`  ✓ ${filename}`);
  await context.close();
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const { child, url } = await startDevServer();
  const browser = await chromium.launch();
  try {
    for (const viewport of Object.values(VIEWPORTS)) {
      for (const route of ROUTES) {
        await screenshotRoute({
          browser,
          viewport,
          seedSession: route.requireAuth,
          route,
          url,
          outDir: OUT_DIR,
        });
      }
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
