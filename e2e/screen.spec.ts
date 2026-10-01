import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';


test('the screen is a 280 by 192 canvas', async ({ page }: { page: Page }) => {
  await page.goto('/');

  await expect(page.locator('akalabeth-apple-screen canvas')).toHaveJSProperty('width', 280);
});


test('the test pattern paints a lit pixel at the end of the diagonal', async ({ page }: { page: Page }) => {
  await page.goto('/');
  await page.waitForTimeout(200);

  const green: number = await page.locator('akalabeth-apple-screen canvas').evaluate(
    (canvas: HTMLCanvasElement): number => (canvas.getContext('2d') as CanvasRenderingContext2D).getImageData(279, 159, 1, 1).data[1],
  );

  expect(green).toBeGreaterThan(0);
});
