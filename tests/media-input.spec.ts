import { test, expect } from '@playwright/test';

test('plate input requests uppercase text keyboard and preserves numbers', async ({ page }) => {
  await page.goto('/inicio');
  const plate = page.getByLabel('Insira sua placa:');
  await expect(plate).toHaveAttribute('autocapitalize', 'characters');
  await expect(plate).toHaveAttribute('inputmode', 'text');
  await expect(plate).toHaveAttribute('enterkeyhint', 'search');
  await plate.fill('abc1d23');
  await expect(plate).toHaveValue('ABC1D23');
});

for (const width of [390, 1440]) {
  test(`hero video starts without interaction at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/saiba-mais/index.html');
    const video = page.locator(width === 390 ? '.video-mobile' : '.video-desktop');
    await expect(video).toBeVisible();
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused && v.currentTime > 0)).toBe(true);
    expect(await video.evaluate((v: HTMLVideoElement) => v.muted && v.playsInline)).toBe(true);
    await expect(page.getByRole('button', { name: 'Reproduzir vídeo' })).toBeHidden();
  });
}

test('offers playback when browser blocks autoplay', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('Blocked', 'NotAllowedError'));
  });
  await page.goto('/saiba-mais/index.html');
  await expect(page.getByRole('button', { name: 'Reproduzir vídeo' })).toBeVisible();
});
