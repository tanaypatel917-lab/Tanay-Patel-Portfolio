import { expect, test } from '@playwright/test';

for (const delay of [250, 850, 1600]) {
  test(`Skip restores the hero during the ${delay}ms beat`, async ({ page }) => {
    await page.goto('/');
    const skip = page.getByRole('button', { name: 'Skip intro', exact: true });
    await expect(skip).toBeVisible();
    await page.waitForTimeout(delay);
    if (await skip.isVisible()) await skip.click();
    await expect(page.locator('.intro')).not.toBeVisible();
    await expect(page.locator('.hero')).toHaveAttribute('data-intro-state', 'complete');
    await expect(page.getByRole('heading', { name: 'Tanay Patel', level: 1 })).toBeVisible();
    await expect(page.locator('html')).not.toHaveAttribute('data-scroll-locked');
  });
}

test('the prologue finishes by its deadline and does not repeat on reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.intro')).toBeVisible();
  await expect(page.locator('.intro')).not.toBeVisible({ timeout: 3100 });
  await expect(page.locator('.hero')).toHaveAttribute('data-intro-state', 'complete');
  expect(await page.evaluate(() => sessionStorage.getItem('tp-intro-v2'))).toBe('1');
  await page.reload();
  await expect(page.getByRole('link', { name: 'View work', exact: true })).toBeVisible();
  await page.waitForTimeout(350);
  await expect(page.locator('.intro')).not.toBeVisible();
});

test('reduced motion can interrupt an active prologue safely', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.intro')).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.intro')).not.toBeVisible();
  await expect(page.locator('html')).not.toHaveAttribute('data-scroll-locked');
  await expect(page.locator('.hero')).toHaveAttribute('data-intro-state', 'complete');
});

test('resize does not leave a displaced name or scroll lock', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.intro')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.intro')).not.toBeVisible();
  await expect(page.locator('html')).not.toHaveAttribute('data-scroll-locked');
  await expect(page.getByRole('heading', { name: 'Tanay Patel', level: 1 })).toBeVisible();
});

test('a blocked display font leaves the ordinary page usable', async ({ page }) => {
  await page.route('**/fonts/overused-grotesk/**', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('.hero')).toHaveAttribute('data-intro-state', 'complete');
  await expect(page.locator('.intro')).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tanay Patel', level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'View work', exact: true })).toBeVisible();
});

test('replay is explicit and does not enable sound', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('tp-intro-v2', '1'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Replay intro', exact: true }).click();
  await expect(page.locator('.intro')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.intro')).not.toBeVisible();
  await expect(page.locator('.site-nav__sound')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('html')).not.toHaveAttribute('data-scroll-locked');
});
