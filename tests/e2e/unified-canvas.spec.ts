import { test, expect } from '@playwright/test';

test.describe('Unified canvas harness', () => {
  test('boots compositor and exposes debug controls', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('#canvasContainer')).toBeVisible();
    await expect(page.locator('#unified-debug-panel')).toBeVisible({ timeout: 15000 });

    await page.waitForFunction(() => Boolean((window as any).vibUnifiedDemo));
    const diagValue = await page.evaluate(() => (window as any).vibUnifiedDemo?.diagnostics?.());
    expect(diagValue.layers.length).toBeGreaterThanOrEqual(5);

    await page.waitForFunction(() => Boolean((window as any).vibUnifiedDemo?.inputs?.state));
    const state = await page.evaluate(() => (window as any).vibUnifiedDemo?.inputs?.state);
    expect(ArrayBuffer.isView(state.bands)).toBe(true);
    expect(state.bands.length).toBe(7);
    expect(typeof state.energy).toBe('number');

    const canvasCount = await page.locator('#canvasContainer canvas').count();
    expect(canvasCount).toBeGreaterThan(0);
  });
});
