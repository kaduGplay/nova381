import { test, expect } from '@playwright/test';

for (const width of [390, 1440]) {
  test(`vehicle details appear above passages at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route('**/api/vehicles/ABC1D23', route => route.fulfill({ json: {
      plate: 'ABC1D23', brand: 'VW', model: 'GOL', year: '2020', modelYear: '2021',
      color: 'PRATA', source: 'Falcon Data Hub',
    } }));
    await page.goto('/passagens-abertas?plate=ABC1D23');
    const card = page.locator('.vehicle-summary');
    await expect(card.locator('dd')).toHaveText(['VW', 'GOL', '2020 / 2021', 'PRATA']);
    const vehicleBox = await card.boundingBox();
    const headingBox = await page.locator('#demo-title').boundingBox();
    expect(vehicleBox!.y + vehicleBox!.height).toBeLessThanOrEqual(headingBox!.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  });
}

test('an unavailable lookup never invents vehicle details or blocks passages', async ({ page }) => {
  await page.route('**/api/vehicles/ABC1D23', route => route.fulfill({ status: 503, json: { error: 'Consulta de veículo ainda não configurada.' } }));
  await page.goto('/passagens-abertas?plate=ABC1D23');
  await expect(page.locator('.vehicle-summary [role="status"]')).toHaveText('Consulta de veículo ainda não configurada.');
  await expect(page.locator('.vehicle-summary dl')).toBeHidden();
  await expect(page.locator('.demo-tickets__row')).toHaveCount(3);
});
