import { expect, test } from '@playwright/test';

for (const width of [320, 768, 1024, 1366, 1920]) {
  test(`layout has no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });
}

test('menu handles rapid close and reopen without a stale completion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => sessionStorage.setItem('tp-intro-v2', '1'));
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Menu', exact: true });
  await trigger.click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.menu')).not.toBeVisible();
  await trigger.click();
  await expect(page.locator('.menu')).toBeVisible();
  await page.locator('.menu a[href="#proof"]').click();
  await expect(page).toHaveURL(/#proof$/);
  await expect(page.locator('#proof')).toBeFocused();
  await expect(page.locator('html')).not.toHaveAttribute('data-scroll-locked');
});

test('copy failure retains the selectable address and mail link', async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('tp-intro-v2', '1');
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('denied')) } });
  });
  await page.goto('/#contact');
  await page.getByRole('button', { name: 'Copy email', exact: true }).click();
  await expect(page.locator('.contact__feedback')).toContainText('Select the email address instead.');
  await expect(page.locator('.contact__email')).toHaveAttribute('href', 'mailto:Tanay001@icloud.com');
});

test('the custom not-found page provides working navigation', async ({ page }) => {
  const response = await page.goto('/a-page-that-does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'That page is not here.', level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to work' })).toHaveAttribute('href', '/#work');
  await expect(page.locator('.site-nav__links a').first()).toHaveAttribute('href', '/#work');
});
