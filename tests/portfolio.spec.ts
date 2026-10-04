import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function visit(page: Page, hash = '') {
  await page.addInitScript(() => sessionStorage.setItem('tp-intro-v2', '1'));
  await page.goto(`/${hash}`);
  await expect(page.getByRole('heading', { name: 'Tanay Patel', level: 1 })).toBeVisible();
}

test('first visit offers a skippable prologue and exposes the final hero', async ({ page }) => {
  await page.goto('/');
  const skip = page.getByRole('button', { name: 'Skip intro', exact: true });
  await expect(skip).toBeVisible();
  await skip.click();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Tanay Patel', level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'View work', exact: true })).toBeVisible();
  await expect(page.locator('html')).not.toHaveAttribute('data-scroll-locked');
});

test('mobile name, purpose, and primary action fit the first screen', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await visit(page);
  const action = page.getByRole('link', { name: 'View work', exact: true });
  await expect(action).toBeVisible();
  const box = await action.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y + box!.height).toBeLessThanOrEqual(812);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
});

test('menu uses native modal semantics and restores focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await visit(page);
  const trigger = page.getByRole('button', { name: 'Menu', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Menu', exact: true });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((element) => element.tagName)).toBe('DIALOG');
  await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(page.locator('html')).not.toHaveAttribute('data-scroll-locked');
});

test('remembered audio preference does not autoplay on a new page', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('tp-sound', '1'));
  await visit(page);
  await expect(page.locator('.site-nav__sound')).toHaveAttribute('aria-pressed', 'false');
});

test('anchor navigation preserves hash and focus', async ({ page }) => {
  await visit(page);
  await page.locator('.site-nav__links a[href="#proof"]').click();
  await expect(page).toHaveURL(/#proof$/);
  await expect(page.locator('#proof')).toBeFocused();
  const box = await page.locator('#proof-title').boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(64);
  expect(box!.y).toBeLessThan(250);
});

test('direct contact link skips the introduction and has the night header state', async ({ page }) => {
  await page.goto('/#contact');
  await expect(page.locator('dialog[data-intro][open]')).toHaveCount(0);
  await expect(page.locator('#contact-title')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-night');
});

test('reduced motion reveals complete content without a prologue', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('dialog[data-intro][open]')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Tanay Patel', level: 1 })).toBeVisible();
  await expect(page.getByText('128 lb starter.', { exact: true })).toHaveText('128 lb starter.');
  expect(await page.evaluate(() => document.documentElement.classList.contains('lenis'))).toBe(false);
});

test('mobile navigation and content survive disabled JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  try {
    await page.goto(`${process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000'}/`);
    await expect(page.getByRole('heading', { name: 'Tanay Patel', level: 1 })).toBeVisible();
    await expect(page.locator('nav a[href="#work"]').first()).toBeVisible();
    await expect(page.getByText('Solo winner of the Kean I.D.E.A. eco-grocery competition.', { exact: true }).first()).toBeVisible();
    await expect(page.locator('.cars__poster')).toBeVisible();
  } finally {
    await context.close();
  }
});

test('top and contact have no serious accessibility violations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await visit(page);
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(result.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact || ''))).toEqual([]);
});
