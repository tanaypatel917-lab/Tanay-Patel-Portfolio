import { expect, test } from '@playwright/test';

test('sound is requested explicitly and follows scene and modal visibility', async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => {
    sessionStorage.setItem('tp-intro-v2', '1');
    const resources = { audio: [] as HTMLAudioElement[], gains: [] as GainNode[] };
    (window as Window & { testSound?: typeof resources }).testSound = resources;
    const NativeAudio = window.Audio;
    window.Audio = class extends NativeAudio {
      constructor(src?: string) { super(src); resources.audio.push(this); }
    };
    const NativeContext = window.AudioContext;
    window.AudioContext = class extends NativeContext {
      createGain() {
        const gain = super.createGain();
        resources.gains.push(gain);
        return gain;
      }
    };
  });
  const sounds: string[] = [];
  page.on('request', (request) => { if (request.url().includes('/sounds/')) sounds.push(request.url()); });
  await page.goto('/');
  await expect(page.locator('.site-nav__sound')).toHaveAttribute('aria-pressed', 'false');
  expect(sounds).toHaveLength(0);
  await page.locator('.site-nav__sound').click();
  await expect(page.locator('.site-nav__sound')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(() => {
    const resources = (window as Window & { testSound?: { audio: HTMLAudioElement[]; gains: GainNode[] } }).testSound;
    return resources?.audio.length === 1 && resources.audio[0].paused && resources.gains[0].gain.value === 0;
  })).toBe(true);
  await page.locator('.site-nav__links a[href="#cars"]').click();
  await page.locator('.cars__media').scrollIntoViewIfNeeded();
  await expect(page.locator('.cars__plate')).toHaveAttribute('data-scene-state', 'ready', { timeout: 30_000 });
  await expect.poll(() => page.evaluate(() => {
    const resources = (window as Window & { testSound?: { audio: HTMLAudioElement[]; gains: GainNode[] } }).testSound;
    return resources?.audio[0].paused === false && resources.gains[0].gain.value > 0;
  })).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await expect.poll(() => page.evaluate(() => {
    const resources = (window as Window & { testSound?: { audio: HTMLAudioElement[]; gains: GainNode[] } }).testSound;
    return resources?.audio[0].paused === true && resources.gains[0].gain.value === 0;
  })).toBe(true);
  await expect(page.getByRole('dialog', { name: 'Menu', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sound on', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sound off', exact: true })).toHaveAttribute('aria-pressed', 'false');
  expect(sounds).toHaveLength(1);
});

test('blocked playback is represented honestly and can be retried', async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('tp-intro-v2', '1');
    HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('Playback blocked', 'NotAllowedError'));
  });
  await page.goto('/');
  await page.locator('.site-nav__sound').click();
  await expect(page.locator('.site-nav__sound')).toHaveText('Enable sound');
  await expect(page.locator('.site-nav__sound')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('.site-nav__sound').click();
  await expect(page.locator('.site-nav__sound')).toHaveText('Enable sound');
});
