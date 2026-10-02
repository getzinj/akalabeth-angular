import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const MIRROR: string = 'akalabeth-text-mirror pre';


test.describe('on a desktop', (): void => {
  test('the page has a language and a title', async ({ page }: { page: Page }): Promise<void> => {
    await page.goto('/');

    await expect(page).toHaveTitle('Akalabeth');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('the picture is an image with a name', async ({ page }: { page: Page }): Promise<void> => {
    await page.goto('/');

    await expect(page.getByRole('img', { name: 'Akalabeth' })).toBeVisible();
  });

  test('the text on screen is announced politely', async ({ page }: { page: Page }): Promise<void> => {
    await page.goto('/');

    await expect(page.getByRole('status')).toContainText('TYPE THY LUCKY NUMBER');
  });

  test('the settings can be opened from the keyboard without touching the game', async ({ page }: { page: Page }): Promise<void> => {
    await page.goto('/');
    await expect(page.locator(MIRROR)).toContainText('TYPE THY LUCKY NUMBER');
    await page.getByLabel('Display settings').focus();
    await page.keyboard.press('Enter');

    await expect(page.getByLabel('CRT effect')).toBeVisible();
    await expect(page.locator(MIRROR)).not.toContainText('LEVEL OF PLAY');
  });

  test('the CRT checkbox can be toggled with the space bar without touching the game', async ({ page }: { page: Page }): Promise<void> => {
    await page.goto('/');
    await expect(page.locator(MIRROR)).toContainText('TYPE THY LUCKY NUMBER');
    await page.getByLabel('Display settings').click();
    await page.getByLabel('CRT effect').focus();
    await page.keyboard.press('Space');

    await expect(page.getByLabel('CRT effect')).not.toBeChecked();
    await expect(page.locator(MIRROR)).not.toContainText('LEVEL OF PLAY');
  });

  test('Tab leaves the game and reaches the settings', async ({ page }: { page: Page }): Promise<void> => {
    await page.goto('/');
    await page.keyboard.press('Tab');

    await expect(page.getByLabel('Display settings')).toBeFocused();
  });

  test('a browser shortcut is left to the browser', async ({ page }: { page: Page }): Promise<void> => {
    await page.goto('/');
    await expect(page.locator(MIRROR)).toContainText('TYPE THY LUCKY NUMBER');
    await page.keyboard.press('Control+A');
    await page.waitForTimeout(600);

    await expect(page.locator(MIRROR)).toHaveText('TYPE THY LUCKY NUMBER.....');
  });

  test('the touch pad stays out of the way of a mouse', async ({ page }: { page: Page }): Promise<void> => {
    await page.goto('/');

    await expect(page.getByRole('group', { name: 'Touch controls' })).toBeHidden();
  });
});


test.describe('on a touch screen', (): void => {
  test.use({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });

  test('the touch pad is shown with every button named', async ({ page }: { page: Page }): Promise<void> => {
    await page.goto('/');
    const buttons: number = await page.getByRole('group', { name: 'Touch controls' }).getByRole('button').count();

    expect(buttons).toBe(13);
    await expect(page.getByRole('button', { name: 'Attack' })).toBeVisible();
  });

  test('a touch on Return answers the first question', async ({ page }: { page: Page }): Promise<void> => {
    await page.goto('/');
    await expect(page.locator(MIRROR)).toContainText('TYPE THY LUCKY NUMBER');
    await page.getByRole('button', { name: 'Return', exact: true }).tap();

    await expect(page.locator(MIRROR)).toContainText('LEVEL OF PLAY');
  });

  test('the picture fits the width of the phone', async ({ page }: { page: Page }): Promise<void> => {
    await page.goto('/');
    const box: { width: number } | null = await page.locator('akalabeth-apple-screen .monitor').boundingBox();

    expect(Math.round(box?.width ?? 0)).toBe(390);
  });

  test('the page does not scroll sideways', async ({ page }: { page: Page }): Promise<void> => {
    await page.goto('/');
    const overflow: boolean = await page.evaluate((): boolean => document.documentElement.scrollWidth > document.documentElement.clientWidth);

    expect(overflow).toBe(false);
  });
});
