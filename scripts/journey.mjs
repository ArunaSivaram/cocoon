/**
 * Walks the Cocoon user journey and captures screenshots into docs/journey/
 * for USER_JOURNEY.md.
 *
 * Numbering follows SPEC §2.x / mockup files. As each step adds a screen,
 * append an entry to SCREENS with its auth requirement.
 *
 * Output: docs/journey/<NN>-<screen>-<state>-<phone|laptop>.png
 */
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import {
  SIGNED_IN_INIT_SCRIPT,
  startDevServer,
  stopDevServer,
  VIEWPORTS,
  waitForFontsAndPaint,
} from './_server.mjs';

const SCREENS = [
  { num: '01', name: 'sign-in', state: 'default', path: '/signin', requireAuth: false },
  { num: '02', name: 'home', state: 'idle', path: '/', requireAuth: true },
  // First fixture — "A Calming Evening Walk". Stable id. Has 2 photos, so
  // the Memories section shows the filled state with both thumbnails.
  {
    num: '06',
    name: 'entry-reading',
    state: 'default',
    path: '/entry/11111111-1111-4111-8111-111111111111',
    requireAuth: true,
  },
  // Fourth fixture — "Deadline Worries Keeping Me Up". Has 0 photos, so
  // the Memories section shows the dashed "Add a photo…" button (step 9).
  {
    num: '06b',
    name: 'entry-reading',
    state: 'empty-memories',
    path: '/entry/44444444-4444-4444-8444-444444444444',
    requireAuth: true,
  },
  // Recording and writing states need real mic input — captured manually
  // on real devices for USER_JOURNEY until we add a dev-param forcing
  // state. Mockups 03 and 04 cover the design intent.
];

const OUT_DIR = 'docs/journey';

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const { child, url } = await startDevServer();
  const browser = await chromium.launch();
  try {
    for (const [viewportKey, viewport] of Object.entries(VIEWPORTS)) {
      for (const screen of SCREENS) {
        const context = await browser.newContext({
          viewport,
          deviceScaleFactor: viewport.deviceScaleFactor,
          reducedMotion: 'reduce',
        });
        if (screen.requireAuth) await context.addInitScript(SIGNED_IN_INIT_SCRIPT);
        const page = await context.newPage();
        await page.goto(`${url}${screen.path}`, { waitUntil: 'networkidle' });
        await waitForFontsAndPaint(page);
        const filename = `${OUT_DIR}/${screen.num}-${screen.name}-${screen.state}-${viewportKey}.png`;
        await page.screenshot({ path: filename, fullPage: true });
        console.log(`  ✓ ${filename}`);
        await context.close();
      }
    }
  } finally {
    await browser.close();
    await stopDevServer(child);
  }
  console.log(`\nJourney screenshots written to ./${OUT_DIR}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
