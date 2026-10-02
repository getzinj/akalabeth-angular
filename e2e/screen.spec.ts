import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';


async function litPixelsAbove(page: Page, row: number): Promise<number> {
  return page.locator('akalabeth-apple-screen canvas.picture').evaluate((canvas: HTMLCanvasElement, limit: number): number => {
    const data: Uint8ClampedArray = (canvas.getContext('2d') as CanvasRenderingContext2D).getImageData(0, 0, 280, limit).data;
    let lit: number = 0;

    for (let index: number = 0; index < data.length; index = index + 4) {
      if ((data[index] + data[index + 1] + data[index + 2]) > 0) {
        lit = lit + 1;
      }
    }

    return lit;
  }, row);
}


test('the screen is a 280 by 192 canvas', async ({ page }: { page: Page }) => {
  await page.goto('/');

  await expect(page.locator('akalabeth-apple-screen canvas.picture')).toHaveJSProperty('width', 280);
});


test('the game opens by asking for a lucky number', async ({ page }: { page: Page }) => {
  await page.goto('/');

  await expect(page.locator('akalabeth-text-mirror pre')).toContainText('TYPE THY LUCKY NUMBER');
});


test('typing a lucky number and a level reaches the attribute roll', async ({ page }: { page: Page }) => {
  await page.goto('/');
  await page.keyboard.type('7');
  await page.keyboard.press('Enter');
  await page.keyboard.type('1');
  await page.keyboard.press('Enter');

  await expect(page.locator('akalabeth-text-mirror pre')).toContainText('SHALT THOU PLAY WITH THESE QUALITIES?');
});


test('creating a fighter and leaving the shop draws the overworld', async ({ page }: { page: Page }) => {
  await page.goto('/');
  await page.keyboard.type('7');
  await page.keyboard.press('Enter');
  await page.keyboard.type('1');
  await page.keyboard.press('Enter');
  await page.keyboard.type('YFQ');
  await expect(page.locator('akalabeth-text-mirror pre')).toContainText('COMMAND?');

  expect(await litPixelsAbove(page, 160)).toBeGreaterThan(100);
});


test('the up and down arrows walk north and south', async ({ page }: { page: Page }) => {
  await page.goto('/');
  await page.keyboard.type('7');
  await page.keyboard.press('Enter');
  await page.keyboard.type('1');
  await page.keyboard.press('Enter');
  await page.keyboard.type('YFFQ');
  await expect(page.locator('akalabeth-text-mirror pre')).toContainText('COMMAND?');
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('akalabeth-text-mirror pre')).toContainText('NORTH');
  await page.keyboard.press('ArrowDown');

  await expect(page.locator('akalabeth-text-mirror pre')).toContainText('SOUTH');
});


test('the CRT effect can be turned off', async ({ page }: { page: Page }) => {
  await page.goto('/');
  await expect(page.locator('akalabeth-apple-screen .scanlines')).toHaveCount(1);

  await page.locator('akalabeth-settings-menu summary').click();
  await page.getByLabel('CRT effect').uncheck();

  await expect(page.locator('akalabeth-apple-screen .scanlines')).toHaveCount(0);
});


test('the screen colour choice is remembered', async ({ page }: { page: Page }) => {
  await page.goto('/');
  await page.locator('akalabeth-settings-menu summary').click();
  await page.getByLabel('Screen').selectOption('green');
  await page.reload();
  await page.locator('akalabeth-settings-menu summary').click();

  await expect(page.getByLabel('Screen')).toHaveValue('green');
});


test('the picture keeps a 4:3 shape', async ({ page }: { page: Page }) => {
  await page.setViewportSize({ width: 1000, height: 900 });
  await page.goto('/');

  const box: { width: number; height: number } | null = await page.locator('akalabeth-apple-screen .monitor').boundingBox();

  expect(Math.round(((box?.width ?? 0) / (box?.height ?? 1)) * 100)).toBe(133);
});
