import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const browser = await chromium.launch({ channel: 'chrome' });
const runs = [];
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 812 }]) {
    for (let run = 0; run < 3; run++) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 80, downloadThroughput: 200_000, uploadThroughput: 93_750 });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.addInitScript(() => {
        const result = { lcp: 0, cls: 0, heroReady: 0, introRan: false, interactions: [] };
        window.portfolioMeasurement = result;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) result.lcp = entry.startTime;
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) if (!entry.hadRecentInput) result.cls += entry.value;
        }).observe({ type: 'layout-shift', buffered: true });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) if (entry.interactionId) result.interactions.push(entry.duration);
        }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
        new MutationObserver(() => {
          if (document.querySelector('.intro[open]')) result.introRan = true;
          if (!result.heroReady && document.querySelector('.site-header[data-enhanced]') && document.querySelector('.hero')?.dataset.introState === 'complete') result.heroReady = performance.now();
        }).observe(document, { subtree: true, attributes: true, childList: true });
      });
      await page.goto(baseURL, { waitUntil: 'load' });
      await page.waitForFunction(() => document.querySelector('.site-header[data-enhanced]') && document.querySelector('.hero')?.dataset.introState === 'complete');
      await page.waitForTimeout(1200);
      const loading = await page.evaluate(() => ({
        ...window.portfolioMeasurement,
        transferBytes: performance.getEntriesByType('resource').reduce((sum, entry) => sum + entry.transferSize, 0),
        initialHeavyAssets: performance.getEntriesByType('resource').filter((entry) => /\/models\/|\/sounds\//.test(entry.name)).map((entry) => entry.name),
      }));
      await page.getByRole('link', { name: 'View work', exact: true }).click();
      await page.waitForTimeout(600);
      if (viewport.width < 768) {
        await page.getByRole('button', { name: 'Menu', exact: true }).click();
        await page.keyboard.press('Escape');
      } else {
        await page.locator('.site-nav__links a[href="#proof"]').click();
      }
      await page.waitForTimeout(400);
      const interactions = await page.evaluate(() => window.portfolioMeasurement.interactions);
      runs.push({ viewport, run: run + 1, lcpMs: Math.round(loading.lcp), cls: Number(loading.cls.toFixed(4)), heroReadyMs: Math.round(loading.heroReady), introRan: loading.introRan, transferBytes: loading.transferBytes, initialHeavyAssets: loading.initialHeavyAssets, maximumObservedInteractionMs: interactions.length ? Math.max(...interactions) : null });
      await context.close();
    }
  }
  const report = { measuredAt: new Date().toISOString(), profile: 'Local production Chromium; cold browser cache, 4x CPU slowdown, 80ms latency, 1.6Mbps down / 750Kbps up. Lab observations, not field p75 INP.', runs };
  const folder = new URL('../artifacts/kinetic-v2/', import.meta.url);
  await mkdir(folder, { recursive: true });
  await writeFile(new URL('performance.json', folder), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
