import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const output = new URL('artifacts/kinetic-v2/', root);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

try {
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.intro[open]', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(400);
  await page.screenshot({ path: fileURLToPath(new URL('intro-type.png', output)) });
  await page.waitForTimeout(950);
  await page.screenshot({ path: fileURLToPath(new URL('intro-docking.png', output)) });
  await page.waitForFunction(() => document.querySelector('.hero')?.dataset.introState === 'complete');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: fileURLToPath(new URL('desktop-hero.png', output)) });

  for (const [id, filename] of [['work', 'desktop-work'], ['proof', 'desktop-proof'], ['contact', 'desktop-contact']]) {
    await page.locator(`.site-nav__links a[href="#${id}"]`).click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: fileURLToPath(new URL(`${filename}.png`, output)) });
  }

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.site-nav__links a[href="#cars"]').click();
  await page.locator('.cars__media').scrollIntoViewIfNeeded();
  const load = page.getByRole('button', { name: 'Load 3D', exact: true });
  if (await load.isVisible()) await load.click();
  await page.locator('.cars__plate[data-scene-state="ready"]').waitFor({ timeout: 45000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: fileURLToPath(new URL('desktop-cars.png', output)) });
  const model = await page.locator('.cars__media').screenshot();
  const webp = await page.evaluate(async (source) => {
    const image = new Image();
    image.src = `data:image/png;base64,${source}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1100 / image.naturalWidth);
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/webp', 0.86).split(',')[1];
  }, model.toString('base64'));
  await writeFile(new URL('public/images/car-night.webp', root), Buffer.from(webp, 'base64'));

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: fileURLToPath(new URL('mobile-hero.png', output)) });
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.screenshot({ path: fileURLToPath(new URL('mobile-menu.png', output)) });
  await page.keyboard.press('Escape');

  await page.setViewportSize({ width: 1200, height: 630 });
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: 'html{scrollbar-gutter:auto}body{overflow:hidden}.site-header,.hero__links,.hero__focus,.hero__portrait-note,.skip-link{display:none!important}.hero{height:630px;min-height:630px;padding:40px 48px;border:0;grid-template-rows:36px auto auto}.hero__title-cell{font-size:145px;margin-top:24px}.hero__portrait{grid-column:8/13;align-self:center}.hero__statement{margin-top:20px}.hero__headline{font-size:28px}' });
  await page.screenshot({ path: fileURLToPath(new URL('public/images/portfolio-social.png', root)) });
  console.log(JSON.stringify({ assets: ['public/images/car-night.webp', 'public/images/portfolio-social.png'], errors }, null, 2));
} finally {
  await context.close();
  await browser.close();
}
