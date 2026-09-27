import { chromium } from "@playwright/test";

declare global {
  interface Window {
    __performanceSample: { lcp: number; cls: number; interactions: number[] };
  }
}

const baseUrl = process.env.PERFORMANCE_BASE_URL ?? "http://127.0.0.1:3000";
const routes = ["/", "/articles/a-new-chapter-for-independent-games"];
const viewports = [1280, 390];
const browser = await chromium.launch({ headless: true });
const results: Record<string, { lcp: number[]; cls: number[]; interactionDurations: number[] }> = {};

try {
  for (const route of routes) {
    for (const width of viewports) {
      const key = `${route} @ ${width}px`;
      results[key] = { lcp: [], cls: [], interactionDurations: [] };
      for (let run = 0; run < 3; run += 1) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.addInitScript(() => {
        window.__performanceSample = { lcp: 0, cls: 0, interactions: [] };
        try {
          new PerformanceObserver((list) => {
            const entry = list.getEntries().at(-1);
            if (entry) window.__performanceSample.lcp = entry.startTime;
          }).observe({ type: "largest-contentful-paint", buffered: true });
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
              if (!entry.hadRecentInput) window.__performanceSample.cls += entry.value;
            }
          }).observe({ type: "layout-shift", buffered: true });
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as (PerformanceEntry & { duration: number; interactionId: number })[]) {
              if (entry.interactionId) window.__performanceSample.interactions.push(entry.duration);
            }
          }).observe({ type: "event", buffered: true, durationThreshold: 16 } as PerformanceObserverInit & { durationThreshold: number });
        } catch {
          // Unsupported PerformanceObserver entry types remain zero and are reported as unavailable.
        }
      });
      const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
      if (!response?.ok()) throw new Error(`${route} returned HTTP ${response?.status()}.`);
      await page.waitForTimeout(300);
      if (route === "/") await page.getByRole("link", { name: /a new chapter for independent games/i }).click();
      else await page.getByRole("link", { name: "Stories" }).click();
      await page.waitForTimeout(250);
      const sample = await page.evaluate(() => window.__performanceSample);
      results[key].lcp.push(Math.round(sample.lcp));
      results[key].cls.push(Number(sample.cls.toFixed(3)));
      if (sample.interactions.length) results[key].interactionDurations.push(Math.round(Math.max(...sample.interactions)));
      await page.close();
      }
    }
  }
} finally {
  await browser.close();
}

for (const [route, samples] of Object.entries(results)) {
  const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? null;
  console.log(JSON.stringify({
    route,
    runs: 3,
    lcpMs: samples.lcp,
    medianLcpMs: median(samples.lcp),
    cls: samples.cls,
    medianCls: median(samples.cls),
    interactionDurationsMs: samples.interactionDurations,
    inp: "Maximum observed lab event duration is a proxy; field INP requires deployed real-user data.",
  }));
}
