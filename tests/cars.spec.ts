import { expect, test, type Page } from '@playwright/test';

async function openCar(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem('tp-intro-v2', '1'));
  await page.goto('/#cars');
  await page.locator('.cars__media').scrollIntoViewIfNeeded();
  await expect(page.locator('.cars__plate')).toHaveAttribute('data-scene-state', 'ready', { timeout: 30_000 });
}

test('3D stays out of the hero and inspection reuses a single scene', async ({ page }) => {
  test.setTimeout(60_000);
  const models: string[] = [];
  page.on('request', (request) => { if (request.url().includes('/models/car-web.glb')) models.push(request.url()); });
  await page.addInitScript(() => sessionStorage.setItem('tp-intro-v2', '1'));
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'View work', exact: true })).toBeVisible();
  expect(models).toHaveLength(0);
  await page.locator('.site-nav__links a[href="#cars"]').click();
  await page.locator('.cars__media').scrollIntoViewIfNeeded();
  await expect(page.locator('.cars__plate')).toHaveAttribute('data-scene-state', 'ready', { timeout: 30_000 });
  await page.getByRole('button', { name: 'Inspect car', exact: true }).click();
  await expect(page.locator('.cars__plate')).toHaveAttribute('data-car-mode', 'inspect');
  const before = await page.locator('.cars__media').screenshot();
  await page.getByRole('button', { name: 'Side', exact: true }).click();
  await expect.poll(async () => before.equals(await page.locator('.cars__media').screenshot())).toBe(false);
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await page.getByRole('button', { name: 'Reset view', exact: true }).click();
  await expect(page.locator('.cars__canvas canvas')).toHaveCount(1);
  await page.getByRole('button', { name: 'Return to guided view', exact: true }).click();
  await expect(page.locator('.cars__plate')).toHaveAttribute('data-car-mode', 'guided');
  expect(models).toHaveLength(1);
});

test('reduced motion uses the real poster until 3D is requested', async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const models: string[] = [];
  page.on('request', (request) => { if (request.url().includes('/models/car-web.glb')) models.push(request.url()); });
  await page.goto('/#cars');
  await page.locator('.cars__media').scrollIntoViewIfNeeded();
  await expect(page.locator('.cars__poster')).toBeVisible();
  await expect(page.locator('.cars__poster img')).toHaveJSProperty('complete', true);
  expect(models).toHaveLength(0);
  await page.getByRole('button', { name: 'Load 3D', exact: true }).click();
  await expect(page.locator('.cars__plate')).toHaveAttribute('data-scene-state', 'ready', { timeout: 30_000 });
  await page.getByRole('button', { name: 'Inspect car', exact: true }).click();
  await page.getByRole('button', { name: 'Front', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.cars__plate')).toHaveAttribute('data-car-mode', 'guided');
});

test('model failure preserves the page and offers a bounded retry', async ({ page }) => {
  await page.route('**/models/car-web.glb', (route) => route.abort());
  await page.addInitScript(() => sessionStorage.setItem('tp-intro-v2', '1'));
  await page.goto('/#cars');
  await page.locator('.cars__media').scrollIntoViewIfNeeded();
  await expect(page.locator('.cars__plate')).toHaveAttribute('data-scene-state', 'error');
  await expect(page.locator('.cars__poster')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tanay Patel', level: 1 })).toBeVisible();
  const retry = page.getByRole('button', { name: 'Retry 3D', exact: true });
  await retry.click();
  await expect(page.locator('.cars__plate')).toHaveAttribute('data-scene-state', 'error');
  await retry.click();
  await expect(page.locator('.cars__plate')).toHaveAttribute('data-scene-state', 'error');
  await expect(retry).toHaveCount(0);
});

test('inspection does not capture the page wheel', async ({ page }) => {
  test.setTimeout(60_000);
  await openCar(page);
  await page.getByRole('button', { name: 'Inspect car', exact: true }).click();
  await page.locator('.cars__media').hover();
  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 180);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before + 20);
  await expect(page.locator('.cars__plate')).toHaveAttribute('data-car-mode', 'inspect');
});
